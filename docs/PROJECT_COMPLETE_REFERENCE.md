# المرجع الشامل لمشروع نؤطة — No2ta

> **تحديث لاحق للدراسة — 4 نوفمبر 2026:** أُصلحت محليًا تبعيات الأيقونات والتنسيق والخطوط الخارجية، وظهور الأدوات، وعمود `interaction_count`، وأضيفت أوامر start/build/test واختبارات لقاعدة البيانات ولعميلين. تفاصيل التشغيل الجديدة في README.md. الجرد والملحق أدناه لقطة قبل هذه الإصلاحات وليسا نسخة محدثة من ملفات التشغيل. لم تُرفع هذه الإصلاحات إلى GitHub أثناء هذا العمل، ولم يكتمل اختبار الواجهة بصريًا لأن فتح المتصفح المحلي رُفض.

تاريخ الدراسة: **4 نوفمبر 2026 — Africa/Cairo**. لقطة المصدر: `b398b578f30f8219f65fe555cee93681f901812a`، مع الاعتماد على ملفات مساحة العمل وقت إنشاء هذا المرجع.

## 1. طريقة قراءة المرجع وحدود التغطية

هذا ملف واحد يجمع شرح المشروع، قراراته، نقاط الاختلاف بين الوثائق والكود، وفهارس مستخرجة آليًا، ثم النص الكامل لملفات المشروع النصية. الأجزاء التحليلية تصف التنفيذ الحالي؛ أما الملحق فهو لقطة للمصادر والوثائق القديمة وقد يحتوي خططًا أو ادعاءات لم تعد مطابقة للتنفيذ. عند التعارض يُقدَّم الكود الحالي على الشرح التاريخي.

شملت الدراسة ملفات Markdown الأربعة الخاصة بالمشروع: README.md وdocs/NO2TA_APP_STUDY.md وdocs/ROADMAP_NEXT.md وdocs/DESIGN_SYSTEM.md، والخادم والواجهة وخدمات الشبكة وقاعدة البيانات وسكريبتات ويندوز وملفات التصميم والاختبارات التعليمية. تعليمات AGENTS.md التي أرسلها المستخدم تفيد بتوفر Postman CLI؛ لا يظهر ملف AGENTS.md فعلي ضمن الجرد الحالي.

المقصود بكل الملفات هنا ملفات المشروع، وليس آلاف ملفات المكتبات داخل node_modules أو التاريخ الداخلي لـ.git. تُفهرس الملفات الصوتية والمكتبة المصغرة وبصماتها دون نسخ بياناتها الثنائية؛ ويُدرج ملخص dependency lock بدل نسخ ملف القفل كاملًا. لا تُنسخ قاعدة بيانات تشغيل أو سجلات شخصية. كلمة المرور المشتركة محجوبة حتى في الملحق؛ أسماء المتغيرات ومواضعها محفوظة. هذا ليس تقرير اختبارات تشغيلية: لم يُشغَّل السيرفر أو Agent ولم تتغير البيانات أو إعدادات الجهاز.

### دليل الأقسام

- 2–5: الفكرة والبنية والتشغيل والتخزين.
- 6–11: الميزات والصلاحيات والشبكة والتصميم والملاحظات وخطة التحقق.
- 12: جرد كل الملفات مع الحجم والبصمة.
- 13: الاعتماديات وإصدارات ملف القفل.
- 14: جميع مسارات HTTP ومواضع المعالجات.
- 15: جميع أحداث Socket.IO الثابتة وفهارس الاستقبال والإرسال.
- 16: مخطط SQL الكامل.
- 17: فهرس الدوال، عناصر DOM، التخزين المحلي، CSS tokens والاتصالات الخارجية.
- 18: تطابق نسخ Windows Agent.
- 19: النص الكامل للوثائق وملفات المصدر، مع حجب كلمة المرور.

## 2. المنتج والغرض

نؤطة شبكة اجتماعية وتعاون للفصل على LAN. جهاز مضيف يشغّل Node.js، والأجهزة الأخرى تدخل من متصفح على عنوانه. التطبيق يجمع الشات العام والخاص والجروبات، الاستوريهات، نقل الملفات، السبورة، كشكول الأكواد، مشاركة الشاشة، الصوت المتزامن، التسبيح، مواقيت الصلاة وجدول اليوم، اختبارات تعليمية وتحدي حساب سريع وأدوات إدارة ومتابعة المعمل.

الدوران الأساسيان admin وstudent. توجد أدوار عضوية جروبات مستقلة عن دور التطبيق. الاعتماد على MAC وكلمة سر مشتركة لا يساوي نظام حسابات وجلسات موثوقًا؛ التفاصيل في قسم الصلاحيات.

الوظائف المحلية تتواصل مع نفس المضيف، لكن الواجهة تحمل Tailwind وLucide والخطوط من الإنترنت، والبحث الموسيقي والقرآن غير المخزّن وTTS وبعض خدمات WebRTC لها تبعيات خارجية. لذلك وصف التطبيق بأنه يعمل بالكامل دون إنترنت غير دقيق في متصفح جديد بلا كاش.

## 3. البنية التقنية ومسؤوليات الملفات

| الطبقة | التنفيذ الفعلي |
|---|---|
| الخادم | CommonJS، Express، HTTP، Socket.IO؛ نقطة الدخول server.js |
| قاعدة البيانات | SQLite عبر sqlite3، تعريف وإنشاء الجداول في data/db.js |
| الواجهة | public/index.html + public/js/app.js، DOM مباشر وكائن STATE عام |
| الشكل | Tailwind CDN، Lucide CDN، design-tokens.css، style.css |
| الملفات | Multer إلى uploads، روابط ثابتة عبر Express |
| الصوت | ملفات محلية، Web Audio، HTMLAudioElement، relay/cache خارجي |
| مشاركة الشاشة | getDisplayMedia وRTCPeerConnection، إشارات عبر Socket.IO |
| متابعة المعمل | html2canvas أو stream في المتصفح؛ PowerShell لسطح المكتب |
| الشبكة | network.js لاستخراج IP/MAC، UDP beacon وخدمات اكتشاف |
| التشغيل | Start_No2ta.bat وFix_Firewall.bat؛ Agent له مثبت وVBS |

لا يوجد React أو Next.js أو Vite أو عملية build في package.json. main يشير إلى index.js غير الموجود، بينما التشغيل الحقيقي node server.js. لا يوجد npm start، وnpm test عبارة عن أمر افتراضي يفشل عمدًا. الاسم no2ta والإصدار 1.0.0 والترخيص المعلن ISC.

server.js يجمع معظم REST والمعالجة اللحظية والبث والصلاحيات والتنظيف. data/db.js يقدم run/get/all كوعود Promise؛ run يعيد id وchanges. services/streaks.js مسؤول عن الاستريكات. data/quran-reciters.js يحتوي أسماء السور ومصادر ثمانية قراء. audio_synth.js يقدم SoundEngine لإشعارات مصنّعة محليًا. صفحات stealth مستقلة HTML بها CSS وJavaScript وأسئلة وواجهة نتائج؛ تسميتها لا تكفي لتحديد المحتوى، والنص الكامل موجود في الملحق.

## 4. التشغيل ودورة الحياة

التشغيل المباشر من جذر المشروع، بعد تثبيت الاعتماديات عند الحاجة:

~~~powershell
npm.cmd install
node server.js
~~~

هذه أوامر موثقة وليست أوامر نُفذت أثناء الدراسة. PORT هو متغير البيئة المباشر الذي يقرأه الخادم؛ الافتراضي 5000. يستمع HTTP على 0.0.0.0. لا توجد طبقة HTTPS داخل هذا الخادم.

Start_No2ta.bat يغيّر مجلد العمل إلى موقعه، ويفحص getmac. الجهاز المطابق لعنوان الأدمن الثابت ينتقل إلى وضع المضيف: يفحص Node وحزم التشغيل، ويحاول npm install عند غيابها، ويحاول إضافة قاعدة Firewall لـTCP 5000، ويفتح localhost ثم يشغّل server.js. باقي الأجهزة تستدعي services/discover-host.ps1 وتفتح URL المكتشف أو تعرض فشل الاكتشاف. الرابط الثابت المطبوع في شاشة المضيف ليس بالضرورة عنوانه الحالي. فحص الحزم السريع في BAT لا يشمل crypto-js رغم استخدامه في الخادم.

عند تشغيل server.js تُنشأ مجلدات رفع مفقودة، ويُحمّل عداد التسبيح، ثم initDB ينشئ الجداول والإعدادات والبذور. يبدأ beacon، وتُستعاد قيمة shared_codepad من SQLite، ثم يبدأ الاستماع ويُطبع رابط الشبكة وQR. لا يستعيد startServer القيمتين focus_mode وstealth_active إلى متغيرات الذاكرة رغم تخزينهما في الجدول. كلمة المرور تُطبع في console في الكود الحالي؛ قيمتها محجوبة هنا.

إيقاف الخادم يفقد الحالة المؤقتة: الحضور، السبورة، اللعبة الجارية، البث الحالي، خريطة الشاشات. تبقى الملفات وSQLite وtasbeeh.json. عند النسخ الاحتياطي يلزم نسخ قاعدة البيانات والمرفقات والعداد معًا، والأبسط إيقاف الخادم قبل النسخ لضمان اتساق اللقطة. لا توجد أتمتة نسخ احتياطي أو ترحيلات مرقمة في المشروع.

## 5. البيانات ومكان حفظ كل حالة

| الحالة | المكان | تفاصيل |
|---|---|---|
| المستخدمون والرسائل والتفاعلات | SQLite | مفاتيح UUID غالبًا، ربط المستخدم بالـdevice_id/IP/MAC |
| الاستوري والمشاهدات | SQLite + uploads | صلاحية زمنية، حذف الصف لا يعني بالضرورة حذف الملف |
| الجروبات والعضوية وطلبات الانضمام | SQLite | unique لكل زوج group/user |
| الاستريك | SQLite | زوج مستخدمين مرتب، يوم تفاعل وعلامة تجميد |
| ملفات AirDrop | SQLite + uploads/airdrop | metadata وعدّاد تنزيلات؛ التحميل الفعلي static |
| الموسيقى | music_library + uploads/music | 3 مقاطع بداية عند خلو الجدول |
| القرآن | uploads/quran | كاش باسم القارئ ورقم السورة، يجلب عند الطلب |
| نتائج الاختبارات | quiz_scores | score/total/percentage ووقت التسليم |
| الإعدادات والكشكول | system_settings | focus_mode، stealth_active، whiteboard_locked، shared_codepad |
| التسبيح الجماعي | data/tasbeeh.json | JSON مستقل عن SQLite |
| الحضور والبث والسبورة واللعبة | ذاكرة Node | ليست محفوظة دائمًا |
| المستخدم والجهاز وإعدادات شخصية | localStorage | ليس session token موثقًا |
| آخر سيرفر مكتشف | TEMP أو data/last_host.txt | مساران بحسب سكريبت الاكتشاف |

يوجد 13 جدول CREATE TABLE في data/db.js. PRAGMA foreign_keys مفعّل، وتوجد علاقات ON DELETE CASCADE. migrations الحالية تحاول إضافة is_read وread_at وتتجاهل أخطاء الإضافة. فهرس quiz_scores على quiz_id وpercentage. لا توجد منظومة audit log أو جدول جلسات أو جدول صلاحيات مستقل. المخطط الحرفي بكل الأعمدة والقيود يأتي لاحقًا.

## 6. السلوك الوظيفي التفصيلي

### الدخول والحضور والبروفايل

واجهة الدخول تجمع كلمة المرور واللقب والأفاتار؛ API يقبل أيضًا bio وdeviceId. تتحقق كلمة المرور المشتركة، ثم تُحسب هوية الجهاز من deviceId أو MAC أو IP. يبحث السيرفر بسجل device_id أو mac_address، ويُنشئ/يحدّث المستخدم مع الدور المستنتج من الجهاز. الاستجابة تحتوي user وisAdmin وmasterPasswordCorrect، ولا تصدر session token. يُحفظ المستخدم والجهاز في localStorage، ثم register_presence يربط Socket بالمستخدم. تعدد التبويبات مدعوم عبر Set من socketIds لكل مستخدم، والخروج الأخير يحدّث is_online وlast_seen.

### الرسائل والصوت والتفاعلات

المحادثات general وdirect وgroup. send_message يستقبل senderId وrecipientId وchatType وcontent وmediaUrl وmediaType وmediaName وmediaSize وdisappearingSeconds. يسجل الرسالة ثم يرسلها إلى الجميع أو طرفي الخاص أو أعضاء الجروب. التفاعل الخاص يستدعي recordInteraction قبل البث؛ لذلك خطأ الاستريك يمكن أن يوقف وصول الحدث رغم تخزين الرسالة.

GET /api/messages يرجع نص الرسائل وبيانات المرسل والتفاعلات، ويعلّم الرسائل الخاصة الواردة كمقروءة. الاستعلامات تستخدم ORDER BY created_at ASC LIMIT 150: هذا يعيد أقدم 150 رسالة، وليس أحدث 150. لا يوجد pagination. read receipts لها REST وSocket. typing يُبث عبر socket.broadcast؛ ليس مقصورًا في الخادم على غرفة محادثة بعينها. لكل مستخدم تفاعل واحد على كل رسالة؛ نفس الإيموجي يلغي التفاعل، وغيره يبدله.

رفع الوسائط حقل file، الصوت audio، الأفاتار avatar؛ Multer يولّد UUID ويحافظ على امتداد الأصل. حد الملف 100 MiB، وحد Socket.IO 50 MiB مستقل عن HTTP JSON. التسجيل يستخدم getUserMedia وMediaRecorder. اختيار timer يحفظ expires_at بتنسيق SQLite، وتنظيف الرسائل كل ثانية يبث disappearing_messages_expired. حذف الرسائل متاح عبر REST وSocket مع فحص المرسل أو الجهاز الإداري، لكن هوية userId القادمة من العميل ليست جلسة موثقة.

### الجروبات والاستوريهات وAirDrop

الجروبات تشمل الإنشاء، اختيار الأعضاء، عرض العضوية، طلب انضمام، قبول/رفض الطلب، وحذف الجروب. قراءة رسائل الجروب تتحقق من عضوية user_id المرسل في الطلب؛ هذا تحقق علاقة داخل DB وليس إثبات هوية صاحب الطلب. مرجع كل handler وحقوله في فهرس REST والملحق.

الاستوري نص وتدرج أو صورة/فيديو، مع عرض متتابع وحلقة حول الأفاتار ومشاهدات وحذف. جدول story_views يمنع تكرار الزوج story/user. تُزال الاستوريهات المنتهية دوريًا كل خمس دقائق. مسار fallback يبحث في uploads/media إذا لم يجد ملف الاستوري في uploads/stories.

AirDrop ليس بروتوكول Apple: رفع إلى الخادم ثم تنزيل عبر HTTP مع metadata وعدّاد. السرعة تعتمد على الشبكة والقرص وحجم الملف؛ رقم 100MB/s في README ليس نتيجة قياس لهذه الدراسة، ويختلف عن حد الرفع 100MiB.

### السبورة والكشكول ومقتطفات الكود

السبورة Canvas ترسل خطوات الرسم وتبثها وتعيد history للمنضم الجديد، وتوفر لونًا وحجم فرشاة وممحاة ومسحًا وتصدير PNG. التنفيذ يحتفظ بحد أقصى 2000 خطوة؛ تعليق متغير الخادم القديم يقول 1000. لا تحفظ الرسومات في SQLite. whiteboard_locked موجود كإعداد افتراضي، لكن handlers الرسم والمسح لا يفحصونه.

كشكول الأكواد نص واحد مشترك، يتزامن عبر codepad_update/codepad_sync ويحفظ في system_settings؛ كما له GET/POST. لا توجد خوارزمية دمج تعاوني CRDT أو تاريخ نسخ؛ الكتابة المتزامنة تستبدل النص. الواجهة تعرض إحصاءات ونسخًا ومسحًا وإرسالًا للشات. مقتطف الكود يحتوي عنوانًا ولغة وكودًا ونسخًا؛ الحافظة لها fallback مناسب لحالات غياب Clipboard API.

### الاستريكات

زوج المستخدمين مرتب لتجنب التكرار. أول تفاعل يعطي 1. في نفس اليوم كل ثالث تفاعل يزيد العداد 1. في يوم جديد إذا الفرق ≤5 أيام يزيد 1، وإذا أكثر تصبح القيمة max(1, floor(old/2)+1). الجمعة والسبت تضبطان is_frozen فقط ولا تمنعان الزيادة. التاريخ يعتمد على وقت نظام المضيف المحلي، بخلاف عرض الصلاة الذي يستخدم Africa/Cairo. عمود interaction_count المستخدم غير مُنشأ في schema الحالي؛ هذه مشكلة تثبيت نظيف مؤكدة من المصدر.

### مشاركة الشاشة ومتابعة المعمل

مشاركة الشاشة تستخدم getDisplayMedia بموافقة المتصفح، ثم WebRTC لكل مشاهد. Socket.IO ينقل offer/answer/ICE وحالة البث فقط؛ لا يسجل الفيديو في DB. الإعداد يتضمن Google STUN. لا يوجد TURN configured. الواجهة تدعم مشاهدة وملء الشاشة وPiP والتحكم بالصوت. توافر الالتقاط والميكروفون يعتمد على secure context والمتصفح، فلا يكفي نجاح الشات على HTTP LAN لضمان نجاحهما.

متابعة المعمل مسار منفصل: html2canvas يلتقط محتوى الصفحة، وليس التطبيقات الأخرى؛ وهناك التقاط stream عند توفره. Windows Agent يلتقط PrimaryScreen، يصغر العرض إلى 960 ويحافظ على النسبة، ويرمز JPEG بجودة 55 إلى Base64 ثم يرسل POST /api/netsupport/frame كل 1500ms بعد اكتمال الدورة. مهلة الطلب 3 ثوانٍ؛ بعد 10 إخفاقات يحاول إعادة الاكتشاف. currentApp في Agent نص ثابت Windows Desktop وليس تعرّفًا فعليًا على عنوان التطبيق النشط.

المثبت ينسخ/ينزل PS1 إلى APPDATA/No2taAgent ويولّد VBS ويضيف No2taLabAgent.vbs إلى Startup ثم يشغّله مخفيًا. لم تُنفّذ هذه العمليات أثناء الدراسة. لوحة الإدارة تعرض الأجهزة واللقطات وتتيح lock/unlock وstealth/message/alarm/navigate/request_screen/kick. قفل المتصفح overlay؛ Agent نفسه لا يقفل Windows، بل يطبع رسالة عند isLocked. لا توجد آلية تحكم بكيبورد/ماوس نظام التشغيل أو تنفيذ أوامر عن بعد في Agent الحالي.

### الصوت والقرآن والموسيقى والتسبيح

activeRadioTrack يجمع track وcurrentTime وisPlaying وstartedAt وDJ. التشغيل/الإيقاف/seek/stop أحداث مشتركة؛ المنضم الجديد يتلقى موقع التشغيل الحالي. نبضة كل 20 ثانية تصحح التسجيلات؛ live stream مستثنى لأنه بلا timeline قابل للمزامنة بالطريقة نفسها. الصوت المحلي فقط يستخدم Audio منفصلًا. فتح الصوت يعتمد على تفاعل المستخدم وautoplay unlock banner.

مكتبة القرآن تحتوي 114 اسم سورة وثمانية قراء: المنشاوي، عبد الباسط، الحصري، السديس، العفاسي، المعيقلي، محمد أيوب، ياسر الدوسري. الصوت يُجلب من mp3quran ويحفظ في uploads/quran؛ يدعم Range للكاش الموجود. انتقال السورة يبدأ عند quran_track_ended من عميل مع debounce ثلاث ثوانٍ، ومن 114 يعود إلى 1. الراديو الحي له relay ومصادر ومحاولات إعادة اتصال منفصلة؛ وجود التسجيلات لم يحذف الراديو الحي القديم.

بحث الموسيقى يدعم مسارات ومصادر fallback تشمل Saavn وDeezer، وتشغيلًا عبر proxy/cache؛ بعض النتائج معاينات قصيرة لا أغنية كاملة. crypto-js يُستخدم لفك روابط Saavn. الرفع المحلي والبحث والحذف والمشاركة للشات موجودة، وبذور الموسيقى ثلاث ملفات WAV. حالة البث نفسها في الذاكرة ولا تستعاد بعد إعادة التشغيل.

السبحة لها ذكر مختار وهدف وعدّاد دورة واليوم والإجمالي وإعداد الصوت. الأهداف تشمل 33 و100 و7 وذكرًا حرًا. عداد الفصل مستقل ومحفوظ JSON، وتوجد أحداث بث صوت الذكر والصلاة على النبي. SoundEngine يولّد أصوات إرسال واستقبال وتفاعل عبر Web Audio، وملفات human_* توفر صوتًا مسجلًا.

### الصلاة والجدول والتمويه والاختبارات والألعاب

محرك مواقيت الإسكندرية يعتمد 31.2001 و29.9187 وحسابات شمسية وزوايا الفجر والعشاء؛ يوجد حساب خادم وfallback في العميل. Africa/Cairo مستخدم لحساب فرق التوقيت، والساعة تتحدث كل ثانية. الجدول الدراسي ثابت في JavaScript وليس نظام جدول قابل للإدارة من DB؛ النص الكامل يتضمن أوقات الحصص والبريك والمرواح.

F2 أو Escape مرتين يفعل التمويه الجماعي؛ F3 يطلب كلمة السر ويفك على الجهاز محليًا. الخادم يبث GLOBAL_STEALTH_ENGAGED ويخزن العلامة. الواجهة تغير عنوان التبويب والأيقونة وتعرض iframe تعليميًا وتوقف وسائط وفق معالجاتها. فك الجميع له Socket بكلمة السر ومسار إداري. زمن أقل من 15ms المذكور في تعليق قديم ليس ضمانًا مقاسًا.

quiz_scores يحفظ userId الاختياري وnickname وquizId وscore وtotal والpercentage، وGET leaderboard يعرض أعلى اليوم وأعلى الكل وآخر عشر وأفضل عشر. الحساب والثقة بالدرجة من العميل، ولا يتحقق endpoint من أن score بين صفر وtotal؛ يوم SQLite هو يوم UTC في الاستعلام الحالي. ليست منصة امتحانات مقاومة للتلاعب.

اللعبة المنفذة Quick Math واحدة: 8 أسئلة جمع/طرح/ضرب، أول جواب صحيح يحصد نقطة، 8 ثوانٍ للسؤال، انتقال بعد 1.5 ثانية عند انتهاء الوقت و1.8 ثانية عند الإجابة. الترتيب بحسب nickname في الذاكرة وليس هوية مستقلة أو leaderboard دائم. بدء لعبة جديد يعيد الحالة، والملتحق المتأخر يحصل على السؤال الحالي. Typing Race وSimon Says وتريفيا وغيرها مقترحات قديمة وليست ميزات منفذة هنا.

## 7. الصلاحيات وحدود الثقة في التنفيذ

MASTER_PASSWORD ثابت في الخادم والعميل وسبق توثيقه نصيًا؛ حُجبت قيمته في هذا الملف. STRICT_ADMIN_MAC ثابت، وisHostAdmin يقارن MAC أو localhost إذا كان للمضيف كارت مطابق. /api/admin/action و/api/netsupport/control يفحصان الجهاز، لكن هذا لا يحمي بقية المسارات تلقائيًا.

register_presence يقبل userData.role لغير الجهاز الإداري بدل فرض student، ثم يكتب الدور في DB. send_message يعتمد data.role لتجاوز focus. عدد من APIs يعتمد userId/senderId أو حقول هوية من body/query؛ لا توجد middleware جلسات عامة تربط كل طلب بالمستخدم. لذلك إخفاء زر الأدمن في UI لا يكفي ضمانًا لصلاحيات البيانات. /api/admin/devices يقرأ قائمة الاتصالات بلا فحص إداري داخل المعالج الظاهر.

يقرأ الخادم x-forwarded-for مباشرة في عدة مسارات، وnetwork.resolveMacAddress يبني أمر arp من IP؛ يلزم التحقق من IP وعدم الثقة بالهيدر بلا proxy موثوق. CORS مفتوح، والمرفقات تحت /uploads تُقدم static. بعض طلبات الشبكة الخارجية تستخدم rejectUnauthorized:false. هذه ملاحظات مصدرية تخص المشروع نفسه، وليست ادعاء اختبار اختراق أو رصد استغلال.

## 8. الشبكة والاكتشاف والاعتماد على الإنترنت

الخادم يبث JSON فيه app=no2ta وhostIp وport وtimestamp إلى 255.255.255.255:5055 كل ثانيتين. يفضل IPv4 يبدأ بـ192.168 ثم أول واجهة متاحة. لا توجد مصادقة beacon. PowerShell ينتظر 3000ms ثم يستخدم TEMP cache؛ نسخة Node تنتظر 1800ms وتكتب data/last_host.txt، وهي أقصر من دورة البث وقد تفوّت الرسالة.

Fix_Firewall.bat يفتح TCP 5000 فقط، ولا يضيف قاعدة UDP 5055. تغيير PORT يحتاج مراجعة السكريبتات والFirewall أيضًا. Agent يحتفظ بـfallback IP ثابت إذا فشل الاكتشاف والكاش. وجود Wi-Fi client isolation أو subnets مختلفة قد يمنع اتصال LAN/broadcast. لم يتم فحص الشبكة الفعلية أو حالة الخدمات الخارجية في هذه الدراسة؛ قائمة الروابط الآتية مستخرجة من المصدر وليست توصية أو تحققًا من توفرها الحالي.

## 9. نظام التصميم والوثائق السابقة

DESIGN_SYSTEM.md هو v1.1 Midnight & Brass: خلفية #0B0A09، أسطح #161310 و#1F1A15، ذهبي #D6B26E، سيج #8A9A8C، حدود ذهبية خفيفة. الخطوط Cairo وPlus Jakarta Sans وJetBrains Mono. الاتجاه RTL مع أجزاء LTR للأرقام والكود. يُقصد توحيد المودالات والأزرار والحقول والمسافات وأن تكون Lucide بديلًا عن الإيموجي الوظيفي؛ الإيموجي الشخصي يظل مسموحًا.

design-tokens.css مربوط في HTML وstyle.css يطبق القواعد والتوافق مع كلاسات قائمة، لكن أجزاء JavaScript تواصل إنشاء كلاسات وألوان قديمة. animate-pulse في زر التمويه وبعض الإيموجي لا يزالان موجودين؛ عبارة استبدال كل الإيموجي في تعليق tokens ليست إثبات اكتمال. وثيقة التصميم نفسها تحتفظ بتناقضات تحريرية مثل السماح بإيموجي واحد في قسم لاحق بعد حظر الوظيفي، وذكر Phosphor رغم اعتماد Lucide. لا تُعامل كمواصفة منفذة بالكامل.

docs/design-system-preview.html معاينة تاريخية، وdesign-direction-preview-v2.html مقارنة اتجاهات؛ ليستا صفحات runtime تحت public. NO2TA_APP_STUDY.md تصف مرحلة ما قبل التصميم وأرقام أسطر قديمة وتنقصها إضافات لاحقة. ROADMAP_NEXT.md يحتوي تحديث حالة في أعلاه ثم خطة أصلية أسفله؛ عبارات تم الاختبار هي تقارير سابقة ولم يعاد إثباتها هنا. README مختصر تسويقي وتشغيلي لا مرجع نهائي لكل القيود.

## 10. الملاحظات المؤكدة وما يحتاج تحققًا

| الأولوية | الملاحظة | أساس الاستنتاج وأثره |
|---|---|---|
| مرتفعة | interaction_count غير موجود في schema | SQL الاستريك يتطلبه، لا يوجد migration له؛ تثبيت جديد يفشل في هذا المسار |
| مرتفعة | هوية وصلاحيات العميل موثوق بها في مسارات متعددة | role/userId/senderId لا ترتبط بجلسة مصادق عليها |
| مرتفعة | كلمة سر مشتركة موجودة في العميل | ليست سرًا يمكن حمايته بإخفاء input؛ المصدر يكشفها |
| مرتفعة | الثقة بـx-forwarded-for وبناء أمر arp | يلزم تحقق IP وحدود proxy موثوق قبل تشغيل الأمر |
| متوسطة | JSON frames وحدود parser | express.json() بلا limit مخصص؛ Base64 كبير قد يتجاوز الحد الافتراضي، بخلاف Socket 50MiB |
| متوسطة | فقد focus/stealth عند إعادة التشغيل | الكتابة إلى settings موجودة، الاستعادة في startServer للكشكول فقط |
| متوسطة | الرسائل القديمة فقط بعد 150 رسالة | ASC LIMIT 150 بلا pagination |
| متوسطة | حذف صفوف دون ضمان حذف الملفات | تراكم مرفقات/كاش ومساحة تخزين، ولا توجد سياسة retention شاملة |
| متوسطة | كاش قرآن غير ذري | الكتابة مباشرة للملف النهائي قد تُترك ناقصة عند انقطاع upstream |
| متوسطة | Range والتحقق من أرقام السور | يلزم اختبار malformed ranges وحدود المدخلات، ولا يكفي مسار happy path |
| متوسطة | منع TLS verification في اتصالات خارجية | يلزم مراجعته عند تجهيز نشر موثوق |
| متوسطة | لا schema version ولا اختبارات جاهزة | catch الفارغ في migrations/background قد يخفي أخطاء |
| منخفضة | package main وscripts غير مطابقين للتشغيل | index.js غائب، start/build/lint غير معرفة |
| منخفضة | lockfile مستبعد من Git | package-lock موجود محليًا لكنه في .gitignore؛ إعادة التثبيت قد تختلف |
| منخفضة | نسخ Agent متكررة | يلزم مزامنتها عند أي تعديل؛ مقارنة البصمات أدناه |

الملاحظات لا تعني أن كل سيناريو فشل شوهد عمليًا. العيوب المبنية على مقارنة schema/SQL مباشرة مؤكدة مصدرًا؛ الأداء، الأمان الكامل، توافق المتصفحات، وجودة الصوت والمزامنة تحتاج تشغيلًا واختبارات مخصصة.

## 11. دليل صيانة وتحقيق لاحق

ابدأ بتثبيت مخطط البيانات وهوية الطلبات قبل توسيع الميزات. اجعل تغييرات الواجهة تراعي DOM IDs وinline handlers وعقود Socket وREST الموجودة. عند تعديل Agent حدّث نسخة الجذر وpublic/agent معًا. عند تعديل التصميم حدّث tokens والمواصفة وتجنب إضافة قيم متعارضة في القوالب الديناميكية. أي اعتماد خارجي يحتاج fallback واضح وتوثيقًا لإصدار المكتبة ومصدرها.

قائمة تحقق مقترحة وليست نتائج منفذة:

1. تشغيل نسخة بيانات اختبار نظيفة وملاحظة migrations ومسار أول رسالة خاصة.
2. متصفحان بهويتين مختلفتين: عام/خاص/جروب، رفض غير العضو، read receipts، حذف وتفاعل و150+ رسالة.
3. رفع وسائط وصوت وأفاتار واستوري وAirDrop عند الحدود، ثم انتهاء الصلاحية وفحص مساحة القرص.
4. مستخدم جديد أثناء رسم/كشكول/بث/لعبة: استلام الحالة وتجنب فقد تحديثات متزامنة.
5. تشغيل قرآن من مصدر جديد وكاش قديم وانقطاع اتصال، ثم Range وautoplay وتقدم السور.
6. Agent على جهاز اختبار بموافقة صاحبه: بداية التشغيل، الشبكة المتغيرة، حجم الإطار، إزالة Startup عند إنهاء التجربة.
7. إعادة تشغيل الخادم وفحص كل حالة يفترض استمرارها؛ اختبار timezone/UTC وحدود منتصف الليل.
8. مراجعة RTL والموبايل ولوحة المفاتيح والمودالات والإيموجي والقيم المخالفة للتصميم.

لم يُجر commit أو push ولم تُعدل ملفات تشغيل المشروع في هذه المهمة؛ المخرج النهائي هو المرجع نفسه.

## 12. الجرد الكامل للملفات

الحجم بالبايت، SHA-256 للمحتوى الأصلي قبل الحجب. ملفات المكتبات وتاريخ Git مستثناة من الاجتياز كما وُضح.

| الملف | الحجم | الأسطر للنصي | SHA-256 |
|---|---:|---:|---|
| .gitignore | 589 | 31 | 939cc34cdc6dc0c90db6f56ecceb75ea7dc112022885986296e3f7d3e1befffb |
| Fix_Firewall.bat | 998 | 26 | f522fa3b93d280eafa0793899be681aa2d79275b95007b2eb7f3506212bc4e8c |
| README.md | 6745 | 65 | fa7e7d1df8e60739b0f1a1f12a1a6d587033c1c25186ed415104593f49a7b7d8 |
| Start_No2ta.bat | 3815 | 96 | 2f3ba446fa121f13369e46c97fcfcf501f33f41029ab89c3134d9eef936db042 |
| data/db.js | 9203 | 241 | 9709ab63df72e90adc026ce69e4d68e6fb5aeecef1be91239e43181d7ac404da |
| data/no2ta.db | 147456 | — | a1882cd8060bab63299a32fa144a6c99d30774539b89a579c3ad7c21767e5337 |
| data/quran-reciters.js | 3835 | 48 | e9266aafe50d0b189e590ffcea5c4c2d7447a32a25934da014bc3628d479cdc9 |
| data/tasbeeh.json | 15 | 1 | a412f518f399236d3453660e44a59731c72b34cf8728656749207a7760bdda05 |
| docs/DESIGN_SYSTEM.md | 30266 | 338 | 5dc54d03a991c23b8eaec1daea806690650de052780d6b49b552b1978bd7109b |
| docs/NO2TA_APP_STUDY.md | 28115 | 241 | 65fb013348cfa20cd307662999ad0dd957bc9d3b55048bcc975b9bdf09a80568 |
| docs/ROADMAP_NEXT.md | 16083 | 132 | 397d7a0b9cafce06834060b65c2316d88e04ccae6fd45286e493776c29f0a8e5 |
| docs/design-direction-preview-v2.html | 12701 | 266 | 97ccf7bd075b8e8cfb19dcf60bd136fe356da243e973cbc0a6256131da8691cf |
| docs/design-system-preview.html | 29253 | 469 | c83f101d18d63a84682f0ac7f479d6c45848bd69d7a857ab8320285f705cb30f |
| install-student-agent.bat | 3181 | 54 | ed345e06295f9527879a26549f1dbe8bb0997b7981a36411ecb248d6990429c0 |
| lab-agent.bat | 151 | 6 | 0abbdc03735b9013347572b80d2360b0df2ff664d6be4d375c8611b75575f3f2 |
| lab-agent.ps1 | 5821 | 133 | 942cbb39ebe93863d1b29a7f7fb145f2d6ef433490ca09a8be8473f53aa45a12 |
| package-lock.json | 80172 | 2198 | 0f4c8f54b794362817650a92dd0cc191e1406d2301080af8ab817197344b3974 |
| package.json | 461 | 23 | b1d6a975e5a8a1cafa37d705d0580a6ea89986ab0152df1b06b1a9fc6d92926e |
| public/agent/install-student-agent.bat | 3181 | 54 | ed345e06295f9527879a26549f1dbe8bb0997b7981a36411ecb248d6990429c0 |
| public/agent/lab-agent.bat | 151 | 6 | 0abbdc03735b9013347572b80d2360b0df2ff664d6be4d375c8611b75575f3f2 |
| public/agent/lab-agent.ps1 | 5821 | 133 | 942cbb39ebe93863d1b29a7f7fb145f2d6ef433490ca09a8be8473f53aa45a12 |
| public/agent/run-agent-hidden.vbs | 492 | 13 | 3ce327651c7eec12d0b4db5cc33ab531f4a9b0b3a93c0fad30a423c2caa36d69 |
| public/audio/alhamdulillah.mp3 | 12288 | — | 00c86eefe641a53ca987f5c5b3acbc572f2ac4acdf38d51f77e0e1192709461a |
| public/audio/allahuakbar.mp3 | 13056 | — | e4c5c3322f16246be735c824f824b2f612afa99805d736e94341f063f45ea59f |
| public/audio/astaghfirullah.mp3 | 24000 | — | e417b111f955c88b6e7477f95b9449c33c76b83d79e9f3da88e14363457d9844 |
| public/audio/hasbiyallah.mp3 | 26112 | — | 1679c13c6b8742466957c86ccb81ce7b5f207e729f5d871c902e6e55a591a64c |
| public/audio/human_alhamdulillah.wav | 224596 | — | ada098f58b07672863ef168499e3d0574ff85074f0b224aa0bcfc2f61d50faee |
| public/audio/human_allahuakbar.wav | 330084 | — | f956ce86fd71ae4d2fced81ece1f653e4cc126de65a4c50e9eb5b56a27a2bb1e |
| public/audio/human_astaghfirullah.wav | 505734 | — | 687abe9f0a62099dd5d9896670cc3171fc43ff9bba805257ff633e4de04cf991 |
| public/audio/human_lahawla.wav | 234122 | — | 8ad59682d85cea665bf6a86fbbd7122993ae1d4faddd979c50c999eeb7f0b1c1 |
| public/audio/human_lailahaillallah.wav | 191522 | — | 69a5a3e6402eb29213438690c5da075564a9a35ad8d99f775f5ac0da2982730a |
| public/audio/human_salawat.mp3 | 73925 | — | 02721d2f678d67432089853a67e40da5dc0ff68a368e82064591615154e7cccd |
| public/audio/human_salawat_10.wav | 307284 | — | da8e13e4e1f097881789b218391069f9345035d2a64e531dd62b64c54deffabd |
| public/audio/human_salawat_15.wav | 268696 | — | 024e75c229ed90c58ec909aaa3053333b513a29b283617e4a1320c092e7245b4 |
| public/audio/human_subhan_wabihamdih.wav | 284806 | — | 1d9e446396317d5a90aa007c4d107cb4a54565a2a54d6fe571b1c9a7fc0f40ea |
| public/audio/human_subhanallah.wav | 191522 | — | fee4645bc487a81613a518e386975f4d444748e8d8621b5b000c8d4b6e2cdea6 |
| public/audio/lahawla.mp3 | 27648 | — | 6969cc4df22d2a7499aedc82b5a8ed97483ab37e95228f9e7159e20cf2dda955 |
| public/audio/lailahaillallah.mp3 | 17280 | — | bb64ea6091cf0dcf5335f667118db468d155bc57391703d6b7024d291ea9e02c |
| public/audio/quran_cairo_fallback.mp3 | 839530 | — | 37387f94a60ddab0b29fcd50745c775edd87d9536b0c6ba97c91e166a1649d37 |
| public/audio/quran_cairo_live.mp3 | 7295739 | — | 32f9382481fe7c279830794db6cae8d1b56df84d19ea9100f3dd8a088c0aca4f |
| public/audio/salawat.mp3 | 73925 | — | 02721d2f678d67432089853a67e40da5dc0ff68a368e82064591615154e7cccd |
| public/audio/salawat_full.mp3 | 29376 | — | 4c7b3e95be97d03d80c9a4f00c25bf5f26ee1f1f21669ecc111c74088b5fd001 |
| public/audio/sali_ala_mohamed_voice1.mp3 | 73925 | — | 02721d2f678d67432089853a67e40da5dc0ff68a368e82064591615154e7cccd |
| public/audio/subhan_wabihamdih.mp3 | 36864 | — | 640e24699d8ebe31355384570addd742c54e226272c4afcda055504058e9e283 |
| public/audio/subhanallah.mp3 | 12096 | — | 79a603b96d264e28f1e4dfe11b5320ec7c3600dd4cb7a63308073dc4cf4bba32 |
| public/css/design-tokens.css | 4480 | 104 | f26e9acbd3fcbecd60a1acc491e89215b1225a1b4933337a0f470cf96204cfc4 |
| public/css/style.css | 4427 | 141 | 78ffa5c47da312f99d1a5d6b57bf3fd8f2e9532a7c492fcd61f0bd1f23ddf580 |
| public/index.html | 161721 | 2000 | fcb514463d31058b1eda0a68e91147b95ae588d44f329da80cf96505c3256a7a |
| public/js/app.js | 285063 | 6615 | 576e1e4d13b2fa1254ce65997e7bedc56f30235bfc6947dfef7a88926b565927 |
| public/js/audio_synth.js | 4214 | 127 | 88b54cd7c38d0bc309927149ab82e54c2de65a822c1e63e13020f955c85530a0 |
| public/js/html2canvas.min.js | 198708 | 20 | 4917b15ac829f7546ab1c053b06499786b45a053169f31f436c16c8eb821414e |
| public/stealth/flutter.html | 63611 | 1026 | a1ef12c34bb62d3d1453fa9e9531c5766c194d591ce357d5ebfdb389751c04ba |
| public/stealth/physics.html | 68446 | 1110 | 964eadd1b644d2854252661b1ca582929c277d28d839ae6758553a1f7130ad54 |
| run-agent-hidden.vbs | 492 | 13 | 3ce327651c7eec12d0b4db5cc33ab531f4a9b0b3a93c0fad30a423c2caa36d69 |
| server.js | 142584 | 3203 | 687326f76e026f73c08a402b3c209ec7e6ec673ed50ba805809e7c1de6ee3d27 |
| services/discover-host.ps1 | 1349 | 40 | 9798fdccc2a88a7e1dc3e04e078e6624813d4af5683df6f4eb87f263a058ceba |
| services/discovery.js | 1324 | 38 | 5f80d7178b03e237a70ba2b8abf813c830db6bc3a1dae207b0bf69857a9fbe15 |
| services/find_server.js | 1141 | 40 | 4c08c8a93fcbec6eb307b6a7d5523b7f06050d8f247d284480413cec6855fd2e |
| services/network.js | 2387 | 77 | 97fadcb8a10bac614ffb2f0ad1f50c015f34b07f15983a2fbdae54a8a9c6b79d |
| services/streaks.js | 4898 | 142 | 42a8ea354b28c8e34b6e64999cfb8965e16000583628a6f61a245b28307f61d3 |
| uploads/airdrop/.gitkeep | 0 | — | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| uploads/audio/.gitkeep | 0 | — | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| uploads/avatars/.gitkeep | 0 | — | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| uploads/media/.gitkeep | 0 | — | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| uploads/music/starter_lofi_study.wav | 2646044 | — | 885c68d12be3d01d491848766f76d5168a30edf80dd8a429e87761f70042494f |
| uploads/music/starter_midnight_chill.wav | 2646044 | — | 3ff3978620a90f697809cd923be211b05ccc5bd7c924896e498cf3bdceaa9781 |
| uploads/music/starter_synthwave_energy.wav | 2646044 | — | 4945fe8e98a338815ca05dec7e88d6c9284fe6d8c2ce3c63e2118db66b0b5a48 |
| uploads/quran/.gitkeep | 0 | — | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| uploads/stories/.gitkeep | 0 | — | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |

## 13. الاعتماديات والإصدارات

~~~json
{
  "name": "no2ta",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "cors": "^2.8.6",
    "crypto-js": "^4.2.0",
    "express": "^5.3.0",
    "multer": "^2.5.0",
    "qrcode": "^1.5.4",
    "socket.io": "^4.8.4",
    "sqlite3": "^6.0.1"
  }
}

~~~

نسخة lockfileVersion: 3. الإصدارات التالية من الملف المحلي، ولا تمثل بحثًا عن أحدث إصدار.

| الحزمة | الإصدار المقفول |
|---|---|
| node_modules/@isaacs/fs-minipass | 4.0.1 |
| node_modules/@socket.io/component-emitter | 3.1.2 |
| node_modules/@types/cors | 2.8.19 |
| node_modules/@types/node | 26.6.6 |
| node_modules/@types/ws | 8.18.2 |
| node_modules/abbrev | 4.0.0 |
| node_modules/accepts | 2.0.0 |
| node_modules/ansi-regex | 5.0.1 |
| node_modules/ansi-styles | 4.3.0 |
| node_modules/append-field | 1.0.0 |
| node_modules/base64-js | 1.5.1 |
| node_modules/bindings | 1.5.0 |
| node_modules/bl | 4.1.0 |
| node_modules/body-parser | 2.4.0 |
| node_modules/buffer | 5.7.1 |
| node_modules/busboy | 1.6.0 |
| node_modules/bytes | 3.1.2 |
| node_modules/call-bind-apply-helpers | 1.0.2 |
| node_modules/call-bound | 1.0.4 |
| node_modules/camelcase | 5.3.1 |
| node_modules/chownr | 3.0.0 |
| node_modules/cliui | 6.0.0 |
| node_modules/color-convert | 2.0.1 |
| node_modules/color-name | 1.1.4 |
| node_modules/content-disposition | 2.0.1 |
| node_modules/content-type | 2.1.0 |
| node_modules/cookie | 0.7.2 |
| node_modules/cookie-signature | 1.2.2 |
| node_modules/cors | 2.8.6 |
| node_modules/crypto-js | 4.2.0 |
| node_modules/debug | 4.4.3 |
| node_modules/decamelize | 1.2.0 |
| node_modules/decompress-response | 6.0.0 |
| node_modules/deep-extend | 0.6.0 |
| node_modules/depd | 2.0.0 |
| node_modules/detect-libc | 2.1.2 |
| node_modules/dijkstrajs | 1.0.3 |
| node_modules/dunder-proto | 1.0.1 |
| node_modules/ee-first | 1.1.1 |
| node_modules/emoji-regex | 8.0.0 |
| node_modules/encodeurl | 2.0.1 |
| node_modules/end-of-stream | 1.4.5 |
| node_modules/engine.io | 6.6.11 |
| node_modules/engine.io-parser | 5.2.3 |
| node_modules/engine.io/node_modules/accepts | 1.3.8 |
| node_modules/engine.io/node_modules/mime-db | 1.52.0 |
| node_modules/engine.io/node_modules/mime-types | 2.1.35 |
| node_modules/engine.io/node_modules/negotiator | 0.6.3 |
| node_modules/env-paths | 2.2.1 |
| node_modules/es-define-property | 1.0.1 |
| node_modules/es-errors | 1.3.0 |
| node_modules/es-object-atoms | 1.1.2 |
| node_modules/escape-html | 1.0.3 |
| node_modules/etag | 1.8.1 |
| node_modules/expand-template | 2.0.3 |
| node_modules/exponential-backoff | 3.1.3 |
| node_modules/express | 5.3.0 |
| node_modules/fdir | 6.5.0 |
| node_modules/file-uri-to-path | 1.0.0 |
| node_modules/finalhandler | 2.1.1 |
| node_modules/find-up | 4.1.0 |
| node_modules/forwarded | 0.2.0 |
| node_modules/fresh | 2.0.0 |
| node_modules/fs-constants | 1.0.0 |
| node_modules/function-bind | 1.1.2 |
| node_modules/get-caller-file | 2.0.5 |
| node_modules/get-intrinsic | 1.3.0 |
| node_modules/get-proto | 1.0.1 |
| node_modules/github-from-package | 0.0.0 |
| node_modules/gopd | 1.2.0 |
| node_modules/graceful-fs | 4.2.11 |
| node_modules/has-symbols | 1.1.0 |
| node_modules/hasown | 2.0.4 |
| node_modules/http-errors | 2.0.1 |
| node_modules/iconv-lite | 0.7.3 |
| node_modules/ieee754 | 1.2.1 |
| node_modules/inherits | 2.0.4 |
| node_modules/ini | 1.3.8 |
| node_modules/ipaddr.js | 1.9.1 |
| node_modules/is-fullwidth-code-point | 3.0.0 |
| node_modules/is-promise | 4.0.0 |
| node_modules/isexe | 4.0.0 |
| node_modules/locate-path | 5.0.0 |
| node_modules/math-intrinsics | 1.1.0 |
| node_modules/media-typer | 1.1.1 |
| node_modules/merge-descriptors | 2.0.0 |
| node_modules/mime-db | 1.54.0 |
| node_modules/mime-types | 3.0.2 |
| node_modules/mimic-response | 3.1.0 |
| node_modules/minimist | 1.2.8 |
| node_modules/minipass | 7.1.3 |
| node_modules/minizlib | 3.1.0 |
| node_modules/mkdirp-classic | 0.5.3 |
| node_modules/ms | 2.1.3 |
| node_modules/multer | 2.5.0 |
| node_modules/multer/node_modules/media-typer | 0.3.0 |
| node_modules/multer/node_modules/mime-db | 1.52.0 |
| node_modules/multer/node_modules/mime-types | 2.1.35 |
| node_modules/multer/node_modules/type-is | 1.6.18 |
| node_modules/napi-build-utils | 2.0.0 |
| node_modules/negotiator | 1.1.0 |
| node_modules/node-abi | 3.101.0 |
| node_modules/node-addon-api | 8.9.2 |
| node_modules/node-gyp | 12.4.0 |
| node_modules/nopt | 9.0.0 |
| node_modules/object-assign | 4.1.1 |
| node_modules/object-inspect | 1.13.4 |
| node_modules/on-finished | 2.4.2 |
| node_modules/once | 1.4.0 |
| node_modules/p-limit | 2.3.0 |
| node_modules/p-locate | 4.1.0 |
| node_modules/p-try | 2.2.0 |
| node_modules/parseurl | 1.3.3 |
| node_modules/path-exists | 4.0.0 |
| node_modules/path-to-regexp | 8.4.2 |
| node_modules/picomatch | 4.0.7 |
| node_modules/pngjs | 5.0.0 |
| node_modules/prebuild-install | 7.1.3 |
| node_modules/proc-log | 6.1.0 |
| node_modules/proxy-addr | 2.0.8 |
| node_modules/pump | 3.0.4 |
| node_modules/qrcode | 1.5.4 |
| node_modules/qs | 6.17.1 |
| node_modules/range-parser | 1.3.0 |
| node_modules/raw-body | 3.0.2 |
| node_modules/rc | 1.2.8 |
| node_modules/readable-stream | 3.6.2 |
| node_modules/require-directory | 2.1.1 |
| node_modules/require-main-filename | 2.0.0 |
| node_modules/router | 2.2.0 |
| node_modules/safe-buffer | 5.2.1 |
| node_modules/safer-buffer | 2.1.2 |
| node_modules/semver | 7.8.6 |
| node_modules/send | 1.2.1 |
| node_modules/serve-static | 2.2.1 |
| node_modules/set-blocking | 2.0.0 |
| node_modules/setprototypeof | 1.2.0 |
| node_modules/side-channel | 1.1.1 |
| node_modules/side-channel-list | 1.0.1 |
| node_modules/side-channel-map | 1.0.1 |
| node_modules/side-channel-weakmap | 1.0.2 |
| node_modules/simple-concat | 1.0.1 |
| node_modules/simple-get | 4.0.1 |
| node_modules/socket.io | 4.8.4 |
| node_modules/socket.io-adapter | 2.5.8 |
| node_modules/socket.io-parser | 4.2.7 |
| node_modules/socket.io/node_modules/accepts | 1.3.8 |
| node_modules/socket.io/node_modules/mime-db | 1.52.0 |
| node_modules/socket.io/node_modules/mime-types | 2.1.35 |
| node_modules/socket.io/node_modules/negotiator | 0.6.3 |
| node_modules/sqlite3 | 6.0.1 |
| node_modules/statuses | 2.0.2 |
| node_modules/streamsearch | 1.1.0 |
| node_modules/string_decoder | 1.3.0 |
| node_modules/string-width | 4.2.3 |
| node_modules/strip-ansi | 6.0.1 |
| node_modules/strip-json-comments | 2.0.1 |
| node_modules/tar | 7.5.22 |
| node_modules/tar-fs | 2.1.5 |
| node_modules/tar-fs/node_modules/chownr | 1.1.4 |
| node_modules/tar-stream | 2.2.0 |
| node_modules/tinyglobby | 0.2.17 |
| node_modules/toidentifier | 1.0.1 |
| node_modules/tunnel-agent | 0.6.0 |
| node_modules/type-is | 2.1.0 |
| node_modules/undici | 6.29.1 |
| node_modules/undici-types | 8.9.0 |
| node_modules/unpipe | 1.0.0 |
| node_modules/util-deprecate | 1.0.2 |
| node_modules/vary | 1.1.2 |
| node_modules/which | 6.0.1 |
| node_modules/which-module | 2.0.1 |
| node_modules/wrap-ansi | 6.2.0 |
| node_modules/wrappy | 1.0.2 |
| node_modules/ws | 8.21.3 |
| node_modules/y18n | 4.0.3 |
| node_modules/yallist | 5.0.0 |
| node_modules/yargs | 15.4.1 |
| node_modules/yargs-parser | 18.1.3 |

## 14. جميع معالجات HTTP

الفهرس يحدد الطريقة والمسار وبداية المعالج. contract الكامل (body/query/params والتحقق والاستجابة) محفوظ في المصدر بالملحق، بما فيه الفروع والأخطاء؛ ليس OpenAPI مُختبرًا.

| الطريقة | المسار | موضع المصدر |
|---|---|---|
| USE | `/uploads` | server.js:58 |
| USE | `/uploads/stories/:filename` | server.js:61 |
| GET | `/uploads/music/:filename` | server.js:73 |
| GET | `/api/network-info` | server.js:125 |
| GET | `/api/alexandria-prayers` | server.js:238 |
| GET | `/api/tasbeeh` | server.js:287 |
| GET | `/api/tts` | server.js:311 |
| GET | `/api/quran/live-relay` | server.js:427 |
| GET | `/api/quran/radio-info` | server.js:439 |
| POST | `/api/quran/broadcast` | server.js:458 |
| GET | `/api/quran/library/reciters` | server.js:501 |
| GET | `/api/quran/library/surahs` | server.js:505 |
| GET | `/api/quran/library/stream` | server.js:513 |
| POST | `/api/quran/library/broadcast` | server.js:591 |
| POST | `/api/salawat/trigger` | server.js:637 |
| POST | `/api/quiz/submit-score` | server.js:649 |
| GET | `/api/quiz/leaderboard` | server.js:671 |
| POST | `/api/auth/login` | server.js:703 |
| GET | `/api/users` | server.js:757 |
| POST | `/api/messages/mark-read` | server.js:804 |
| POST | `/api/users/profile` | server.js:830 |
| GET | `/api/messages` | server.js:848 |
| DELETE | `/api/messages/:id` | server.js:951 |
| POST | `/api/upload/media` | server.js:976 |
| POST | `/api/upload/audio` | server.js:987 |
| POST | `/api/upload/avatar` | server.js:998 |
| GET | `/api/stories` | server.js:1005 |
| POST | `/api/stories` | server.js:1047 |
| POST | `/api/stories/:id/view` | server.js:1083 |
| DELETE | `/api/stories/:id` | server.js:1102 |
| GET | `/api/stories/:id/views` | server.js:1127 |
| GET | `/api/streaks/:userId` | server.js:1145 |
| GET | `/api/airdrop/files` | server.js:1159 |
| POST | `/api/airdrop/upload` | server.js:1173 |
| POST | `/api/airdrop/download/:id` | server.js:1199 |
| GET | `/api/groups` | server.js:1212 |
| GET | `/api/groups/:id/members` | server.js:1290 |
| POST | `/api/groups/:id/join-request` | server.js:1324 |
| GET | `/api/groups/:id/join-requests` | server.js:1369 |
| POST | `/api/groups/:id/join-requests/:requestId/respond` | server.js:1400 |
| POST | `/api/groups` | server.js:1467 |
| DELETE | `/api/groups/:id` | server.js:1533 |
| GET | `/api/screen-share/status` | server.js:1562 |
| GET | `/api/music/online/search` | server.js:1748 |
| GET | `/api/music/cover` | server.js:1761 |
| GET | `/api/music/stream` | server.js:1797 |
| POST | `/api/music/online/play` | server.js:1875 |
| GET | `/api/music/library` | server.js:1959 |
| GET | `/api/music/search` | server.js:1980 |
| POST | `/api/music/upload` | server.js:2001 |
| DELETE | `/api/music/:id` | server.js:2031 |
| GET | `/api/codepad` | server.js:2068 |
| POST | `/api/codepad` | server.js:2077 |
| GET | `/api/admin/devices` | server.js:2090 |
| POST | `/api/admin/action` | server.js:2107 |
| POST | `/api/netsupport/frame` | server.js:2205 |
| GET | `/api/netsupport/devices` | server.js:2266 |
| POST | `/api/netsupport/control` | server.js:2363 |

## 15. فهرس Socket.IO

يشمل الاستدعاءات ذات أسماء الأحداث النصية الثابتة فقط؛ كلمة emit تعني إرسال الحدث من الملف المذكور، وon استقبال. البث والغرف والحمولات بالتفصيل في الملحق.

| الملف | العملية | الحدث | السطر |
|---|---|---|---:|
| server.js | emit | `salawat_broadcast` | 300 |
| server.js | on | `error` | 320 |
| server.js | on | `data` | 392 |
| server.js | on | `end` | 393 |
| server.js | on | `error` | 394 |
| server.js | on | `error` | 397 |
| server.js | on | `timeout` | 398 |
| server.js | on | `close` | 435 |
| server.js | emit | `radio_sync_state` | 465 |
| server.js | emit | `radio_sync_state` | 487 |
| server.js | on | `error` | 553 |
| server.js | on | `error` | 555 |
| server.js | on | `timeout` | 559 |
| server.js | emit | `radio_sync_state` | 597 |
| server.js | emit | `radio_sync_state` | 606 |
| server.js | emit | `radio_sync_state` | 622 |
| server.js | emit | `radio_sync_state` | 634 |
| server.js | emit | `salawat_broadcast` | 639 |
| server.js | emit | `quiz_score_submitted` | 664 |
| server.js | emit | `messages_marked_read` | 817 |
| server.js | emit | `user_profile_updated` | 840 |
| server.js | emit | `messages_marked_read` | 887 |
| server.js | emit | `message_deleted` | 968 |
| server.js | emit | `new_story_published` | 1076 |
| server.js | emit | `story_view_updated` | 1093 |
| server.js | emit | `story_deleted` | 1119 |
| server.js | emit | `airdrop_new_file` | 1192 |
| server.js | emit | `airdrop_download_incremented` | 1204 |
| server.js | emit | `new_group_join_request` | 1353 |
| server.js | emit | `group_join_request_accepted` | 1431 |
| server.js | emit | `groups_updated` | 1439 |
| server.js | emit | `group_join_request_rejected` | 1449 |
| server.js | emit | `groups_updated` | 1457 |
| server.js | emit | `group_created` | 1523 |
| server.js | emit | `groups_updated` | 1524 |
| server.js | emit | `group_deleted` | 1553 |
| server.js | emit | `groups_updated` | 1554 |
| server.js | on | `data` | 1582 |
| server.js | on | `end` | 1583 |
| server.js | on | `error` | 1591 |
| server.js | on | `timeout` | 1592 |
| server.js | on | `finish` | 1611 |
| server.js | on | `error` | 1615 |
| server.js | on | `timeout` | 1620 |
| server.js | on | `error` | 1788 |
| server.js | on | `error` | 1859 |
| server.js | on | `error` | 1866 |
| server.js | emit | `music_library_updated` | 1926 |
| server.js | emit | `radio_sync_state` | 1948 |
| server.js | emit | `music_library_updated` | 2021 |
| server.js | emit | `radio_sync_state` | 2057 |
| server.js | emit | `music_library_updated` | 2060 |
| server.js | emit | `codepad_sync` | 2082 |
| server.js | emit | `admin_global_announcement` | 2121 |
| server.js | emit | `chat_focus_mode_changed` | 2131 |
| server.js | emit | `GLOBAL_STEALTH_RELEASED` | 2137 |
| server.js | emit | `user_kicked` | 2144 |
| server.js | emit | `message_deleted` | 2151 |
| server.js | emit | `story_deleted` | 2156 |
| server.js | emit | `streak_boosted` | 2164 |
| server.js | emit | `whiteboard_cleared` | 2169 |
| server.js | emit | `netsupport_device_frame_update` | 2245 |
| server.js | emit | `netsupport_lock_screen` | 2385 |
| server.js | emit | `netsupport_lock_screen` | 2393 |
| server.js | emit | `netsupport_unlock_screen` | 2404 |
| server.js | emit | `netsupport_unlock_screen` | 2409 |
| server.js | emit | `GLOBAL_STEALTH_ENGAGED` | 2417 |
| server.js | emit | `GLOBAL_STEALTH_ENGAGED` | 2419 |
| server.js | emit | `GLOBAL_STEALTH_RELEASED` | 2427 |
| server.js | emit | `GLOBAL_STEALTH_RELEASED` | 2429 |
| server.js | emit | `netsupport_popup_message` | 2438 |
| server.js | emit | `netsupport_popup_message` | 2444 |
| server.js | emit | `netsupport_play_alarm` | 2455 |
| server.js | emit | `netsupport_play_alarm` | 2457 |
| server.js | emit | `netsupport_navigate_url` | 2465 |
| server.js | emit | `netsupport_navigate_url` | 2467 |
| server.js | emit | `netsupport_request_screen_share` | 2474 |
| server.js | emit | `user_kicked` | 2481 |
| server.js | emit | `math_game_state` | 2542 |
| server.js | emit | `math_game_state` | 2546 |
| server.js | emit | `math_game_round_result` | 2557 |
| server.js | on | `connection` | 2563 |
| server.js | emit | `tasbeeh_global_update` | 2569 |
| server.js | emit | `math_game_state` | 2573 |
| server.js | on | `math_game_start` | 2582 |
| server.js | on | `math_game_answer` | 2586 |
| server.js | emit | `math_game_round_result` | 2598 |
| server.js | on | `tasbeeh_increment` | 2602 |
| server.js | emit | `tasbeeh_global_update` | 2609 |
| server.js | emit | `dhikr_spoken_broadcast` | 2612 |
| server.js | on | `broadcast_dhikr_voice` | 2625 |
| server.js | emit | `dhikr_spoken_broadcast` | 2629 |
| server.js | on | `broadcast_quran_cairo` | 2639 |
| server.js | emit | `radio_sync_state` | 2644 |
| server.js | emit | `radio_sync_state` | 2664 |
| server.js | on | `admin_trigger_salawat` | 2669 |
| server.js | emit | `salawat_broadcast` | 2670 |
| server.js | on | `register_presence` | 2679 |
| server.js | emit | `whiteboard_init` | 2716 |
| server.js | emit | `codepad_sync` | 2718 |
| server.js | emit | `chat_focus_mode_changed` | 2720 |
| server.js | emit | `GLOBAL_STEALTH_ENGAGED` | 2723 |
| server.js | emit | `screen_share_started` | 2727 |
| server.js | emit | `radio_sync_state` | 2739 |
| server.js | emit | `presence_update` | 2744 |
| server.js | on | `send_message` | 2748 |
| server.js | emit | `error_notification` | 2751 |
| server.js | emit | `new_message` | 2786 |
| server.js | emit | `new_message` | 2790 |
| server.js | emit | `new_message` | 2793 |
| server.js | emit | `streak_updated` | 2804 |
| server.js | emit | `streak_updated` | 2805 |
| server.js | emit | `new_message` | 2814 |
| server.js | on | `mark_messages_read` | 2823 |
| server.js | emit | `messages_marked_read` | 2834 |
| server.js | on | `typing_start` | 2846 |
| server.js | emit | `user_typing_start` | 2847 |
| server.js | on | `typing_stop` | 2850 |
| server.js | emit | `user_typing_stop` | 2851 |
| server.js | on | `toggle_reaction` | 2855 |
| server.js | emit | `message_reactions_updated` | 2876 |
| server.js | on | `whiteboard_draw_step` | 2883 |
| server.js | emit | `whiteboard_draw_step` | 2886 |
| server.js | on | `whiteboard_clear_board` | 2889 |
| server.js | emit | `whiteboard_cleared` | 2891 |
| server.js | on | `request_whiteboard_history` | 2894 |
| server.js | emit | `whiteboard_init` | 2895 |
| server.js | on | `codepad_update` | 2899 |
| server.js | emit | `codepad_sync` | 2901 |
| server.js | on | `codepad_request_sync` | 2905 |
| server.js | emit | `codepad_sync` | 2906 |
| server.js | on | `TRIGGER_GLOBAL_PANIC` | 2911 |
| server.js | emit | `GLOBAL_STEALTH_ENGAGED` | 2916 |
| server.js | on | `TRIGGER_STEALTH_RELEASE` | 2923 |
| server.js | emit | `GLOBAL_STEALTH_RELEASED` | 2928 |
| server.js | on | `delete_message` | 2933 |
| server.js | emit | `message_deleted` | 2940 |
| server.js | on | `get_screen_share_status` | 2948 |
| server.js | emit | `screen_share_status` | 2949 |
| server.js | on | `screen_share_start` | 2952 |
| server.js | emit | `screen_share_started` | 2961 |
| server.js | on | `screen_share_stop` | 2964 |
| server.js | emit | `screen_share_ended` | 2968 |
| server.js | on | `webrtc_viewer_join` | 2973 |
| server.js | emit | `webrtc_viewer_joined` | 2975 |
| server.js | on | `webrtc_offer` | 2983 |
| server.js | emit | `webrtc_offer` | 2984 |
| server.js | on | `webrtc_answer` | 2991 |
| server.js | emit | `webrtc_answer` | 2992 |
| server.js | on | `webrtc_ice_candidate` | 2999 |
| server.js | emit | `webrtc_ice_candidate` | 3000 |
| server.js | on | `get_radio_status` | 3007 |
| server.js | emit | `radio_sync_state` | 3017 |
| server.js | emit | `radio_sync_state` | 3019 |
| server.js | on | `radio_play` | 3023 |
| server.js | emit | `radio_sync_state` | 3033 |
| server.js | on | `radio_pause` | 3036 |
| server.js | emit | `radio_sync_state` | 3040 |
| server.js | on | `radio_seek` | 3044 |
| server.js | emit | `radio_sync_state` | 3048 |
| server.js | on | `radio_stop` | 3052 |
| server.js | emit | `radio_sync_state` | 3054 |
| server.js | on | `quran_track_ended` | 3059 |
| server.js | on | `netsupport_client_frame` | 3064 |
| server.js | emit | `netsupport_device_frame_update` | 3098 |
| server.js | on | `disconnect` | 3116 |
| server.js | emit | `screen_share_ended` | 3120 |
| server.js | emit | `presence_update` | 3134 |
| server.js | emit | `disappearing_messages_expired` | 3149 |
| public/js/app.js | emit | `math_game_start` | 89 |
| public/js/app.js | emit | `math_game_answer` | 97 |
| public/js/app.js | emit | `mark_messages_read` | 292 |
| public/js/app.js | on | `connect` | 551 |
| public/js/app.js | emit | `register_presence` | 553 |
| public/js/app.js | on | `streak_updated` | 560 |
| public/js/app.js | on | `dhikr_spoken_broadcast` | 586 |
| public/js/app.js | on | `salawat_broadcast` | 592 |
| public/js/app.js | on | `tasbeeh_global_update` | 596 |
| public/js/app.js | on | `presence_update` | 604 |
| public/js/app.js | on | `codepad_sync` | 611 |
| public/js/app.js | on | `new_message` | 621 |
| public/js/app.js | emit | `mark_messages_read` | 656 |
| public/js/app.js | on | `messages_marked_read` | 723 |
| public/js/app.js | on | `group_created` | 740 |
| public/js/app.js | on | `group_deleted` | 751 |
| public/js/app.js | on | `new_group_join_request` | 759 |
| public/js/app.js | on | `group_join_request_accepted` | 776 |
| public/js/app.js | on | `group_join_request_rejected` | 788 |
| public/js/app.js | on | `groups_updated` | 800 |
| public/js/app.js | on | `music_library_updated` | 805 |
| public/js/app.js | on | `user_typing_start` | 809 |
| public/js/app.js | on | `user_typing_stop` | 815 |
| public/js/app.js | on | `message_reactions_updated` | 821 |
| public/js/app.js | on | `disappearing_messages_expired` | 828 |
| public/js/app.js | on | `message_deleted` | 839 |
| public/js/app.js | on | `new_story_published` | 848 |
| public/js/app.js | on | `story_deleted` | 852 |
| public/js/app.js | on | `airdrop_new_file` | 856 |
| public/js/app.js | on | `airdrop_download_incremented` | 862 |
| public/js/app.js | on | `chat_focus_mode_changed` | 867 |
| public/js/app.js | on | `admin_global_announcement` | 878 |
| public/js/app.js | on | `screen_share_started` | 884 |
| public/js/app.js | on | `screen_share_ended` | 888 |
| public/js/app.js | on | `webrtc_viewer_joined` | 892 |
| public/js/app.js | on | `webrtc_offer` | 896 |
| public/js/app.js | on | `webrtc_answer` | 900 |
| public/js/app.js | on | `webrtc_ice_candidate` | 904 |
| public/js/app.js | on | `radio_sync_state` | 909 |
| public/js/app.js | on | `math_game_state` | 914 |
| public/js/app.js | on | `math_game_round_result` | 915 |
| public/js/app.js | on | `story_view_updated` | 918 |
| public/js/app.js | on | `GLOBAL_STEALTH_ENGAGED` | 925 |
| public/js/app.js | on | `GLOBAL_STEALTH_RELEASED` | 936 |
| public/js/app.js | on | `user_kicked` | 942 |
| public/js/app.js | on | `netsupport_lock_screen` | 949 |
| public/js/app.js | on | `netsupport_unlock_screen` | 960 |
| public/js/app.js | on | `netsupport_popup_message` | 966 |
| public/js/app.js | on | `netsupport_play_alarm` | 980 |
| public/js/app.js | on | `netsupport_navigate_url` | 987 |
| public/js/app.js | on | `netsupport_request_screen_share` | 993 |
| public/js/app.js | on | `netsupport_device_frame_update` | 997 |
| public/js/app.js | emit | `TRIGGER_GLOBAL_PANIC` | 1051 |
| public/js/app.js | emit | `TRIGGER_STEALTH_RELEASE` | 1169 |
| public/js/app.js | emit | `mark_messages_read` | 1406 |
| public/js/app.js | emit | `delete_message` | 2317 |
| public/js/app.js | emit | `send_message` | 2373 |
| public/js/app.js | emit | `typing_stop` | 2386 |
| public/js/app.js | emit | `toggle_reaction` | 2391 |
| public/js/app.js | emit | `request_whiteboard_history` | 2926 |
| public/js/app.js | emit | `whiteboard_draw_step` | 2974 |
| public/js/app.js | on | `whiteboard_draw_step` | 2996 |
| public/js/app.js | on | `whiteboard_init` | 3000 |
| public/js/app.js | on | `whiteboard_cleared` | 3006 |
| public/js/app.js | emit | `whiteboard_clear_board` | 3060 |
| public/js/app.js | emit | `codepad_request_sync` | 3110 |
| public/js/app.js | emit | `codepad_update` | 3139 |
| public/js/app.js | emit | `codepad_update` | 3168 |
| public/js/app.js | emit | `screen_share_start` | 3357 |
| public/js/app.js | emit | `screen_share_stop` | 3389 |
| public/js/app.js | emit | `webrtc_ice_candidate` | 3436 |
| public/js/app.js | emit | `webrtc_viewer_join` | 3445 |
| public/js/app.js | emit | `webrtc_ice_candidate` | 3616 |
| public/js/app.js | emit | `webrtc_offer` | 3628 |
| public/js/app.js | emit | `webrtc_answer` | 3650 |
| public/js/app.js | emit | `radio_play` | 4247 |
| public/js/app.js | emit | `radio_play` | 4302 |
| public/js/app.js | emit | `quran_track_ended` | 4506 |
| public/js/app.js | emit | `radio_stop` | 4508 |
| public/js/app.js | emit | `radio_seek` | 4549 |
| public/js/app.js | emit | `radio_pause` | 4561 |
| public/js/app.js | emit | `radio_play` | 4565 |
| public/js/app.js | emit | `radio_stop` | 4577 |
| public/js/app.js | emit | `typing_start` | 4853 |
| public/js/app.js | emit | `typing_stop` | 4859 |
| public/js/app.js | emit | `netsupport_client_frame` | 5515 |
| public/js/app.js | emit | `tasbeeh_increment` | 6067 |
| public/js/app.js | emit | `admin_trigger_salawat` | 6609 |

## 16. قاموس قاعدة البيانات الحرفي

هذه مخططات الإنشاء من data/db.js، وليست نتيجة قراءة قاعدة بيانات مستخدمين فعلية.


### users

~~~sql
CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        device_id TEXT UNIQUE,
        ip_address TEXT,
        mac_address TEXT,
        nickname TEXT NOT NULL,
        avatar TEXT,
        bio TEXT DEFAULT 'طالب جامد في فصل العباقرة ⚡',
        role TEXT DEFAULT 'student',
        is_online INTEGER DEFAULT 0,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
~~~

### messages

~~~sql
CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        recipient_id TEXT,
        chat_type TEXT DEFAULT 'general',
        content TEXT,
        media_url TEXT,
        media_type TEXT,
        media_name TEXT,
        media_size INTEGER DEFAULT 0,
        is_disappearing INTEGER DEFAULT 0,
        expires_at DATETIME,
        is_read INTEGER DEFAULT 0,
        read_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
    );
~~~

### message_reactions

~~~sql
CREATE TABLE IF NOT EXISTS message_reactions (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        emoji TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(message_id, user_id),
        FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
~~~

### stories

~~~sql
CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        media_url TEXT,
        media_type TEXT DEFAULT 'text',
        text_content TEXT,
        bg_gradient TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
~~~

### story_views

~~~sql
CREATE TABLE IF NOT EXISTS story_views (
        id TEXT PRIMARY KEY,
        story_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(story_id, user_id),
        FOREIGN KEY(story_id) REFERENCES stories(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
~~~

### streaks

~~~sql
CREATE TABLE IF NOT EXISTS streaks (
        id TEXT PRIMARY KEY,
        user_a TEXT NOT NULL,
        user_b TEXT NOT NULL,
        streak_count INTEGER DEFAULT 1,
        last_interaction_date TEXT,
        is_frozen INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_a, user_b),
        FOREIGN KEY(user_a) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(user_b) REFERENCES users(id) ON DELETE CASCADE
    );
~~~

### airdrop_files

~~~sql
CREATE TABLE IF NOT EXISTS airdrop_files (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER,
        file_url TEXT NOT NULL,
        downloads_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
    );
~~~

### groups

~~~sql
CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '👥',
        description TEXT DEFAULT '',
        creator_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(creator_id) REFERENCES users(id) ON DELETE CASCADE
    );
~~~

### group_members

~~~sql
CREATE TABLE IF NOT EXISTS group_members (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, user_id),
        FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
~~~

### group_join_requests

~~~sql
CREATE TABLE IF NOT EXISTS group_join_requests (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, user_id),
        FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
~~~

### music_library

~~~sql
CREATE TABLE IF NOT EXISTS music_library (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT DEFAULT 'موسيقى الفصل',
        file_url TEXT NOT NULL,
        file_name TEXT,
        duration TEXT DEFAULT '',
        cover TEXT DEFAULT '',
        uploader_id TEXT,
        uploader_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
~~~

### system_settings

~~~sql
CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );
~~~

### quiz_scores

~~~sql
CREATE TABLE IF NOT EXISTS quiz_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        nickname TEXT NOT NULL,
        quiz_id TEXT NOT NULL DEFAULT 'flutter_competency',
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        percentage REAL NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
~~~

### الترحيلات والفهارس والإعدادات

~~~sql
ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0;
ALTER TABLE messages ADD COLUMN read_at DATETIME;
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('focus_mode', '0');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('stealth_active', '0');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('whiteboard_locked', '0');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('shared_codepad', '// كشكول الأكواد والنصوص المشترك للفصل 💻⚡\n// الصق أي كود أو مسألة برمجية هنا ليراها الجميع فوراً!');
CREATE INDEX IF NOT EXISTS idx_quiz_scores_quiz ON quiz_scores (quiz_id, percentage DESC);
~~~

## 17. فهارس المصدر التفصيلية

الفهارس الآتية مساعدة بحث آلية؛ الدوال المجهولة وarrow callbacks ليست جميعها أسماء مستقلة، ونصها محفوظ في الملحق.

### الدوال والأصناف المسمّاة

| الملف | الاسم | السطر |
|---|---|---:|
| data/quran-reciters.js | getReciterById | 30 |
| data/quran-reciters.js | getSurahAudioUrl | 34 |
| data/quran-reciters.js | getSurahName | 42 |
| lab-agent.ps1 | Find-No2taServer | 14 |
| public/agent/lab-agent.ps1 | Find-No2taServer | 14 |
| public/index.html | across | 16 |
| public/js/app.js | renderAvatarHTML | 74 |
| public/js/app.js | renderIcons | 83 |
| public/js/app.js | startMathGame | 88 |
| public/js/app.js | submitMathAnswer | 92 |
| public/js/app.js | renderMathGameScores | 105 |
| public/js/app.js | handleMathGameState | 120 |
| public/js/app.js | handleMathGameRoundResult | 144 |
| public/js/app.js | enhanceSelect | 158 |
| public/js/app.js | renderOptions | 185 |
| public/js/app.js | syncTriggerLabel | 203 |
| public/js/app.js | closeList | 208 |
| public/js/app.js | openList | 213 |
| public/js/app.js | refreshSelectLabel | 236 |
| public/js/app.js | triggerTabTitleAlert | 269 |
| public/js/app.js | stopTabTitleAlert | 280 |
| public/js/app.js | initDesktopNotifications | 299 |
| public/js/app.js | showDesktopNotification | 311 |
| public/js/app.js | formatChatTime | 339 |
| public/js/app.js | fetchNetworkInfo | 358 |
| public/js/app.js | checkExistingAuth | 425 |
| public/js/app.js | handleLoginSubmit | 440 |
| public/js/app.js | finishLoginSuccess | 489 |
| public/js/app.js | updateProfileUI | 501 |
| public/js/app.js | initSocket | 547 |
| public/js/app.js | setupStealthHotkeys | 1007 |
| public/js/app.js | triggerPanicButton | 1048 |
| public/js/app.js | engageStealthMode | 1057 |
| public/js/app.js | releaseStealthMode | 1099 |
| public/js/app.js | promptLocalStealthUnlock | 1148 |
| public/js/app.js | promptGlobalStealthUnlock | 1160 |
| public/js/app.js | promptStealthUnlock | 1177 |
| public/js/app.js | loadUsers | 1184 |
| public/js/app.js | renderUsersList | 1203 |
| public/js/app.js | updateOnlineCount | 1281 |
| public/js/app.js | switchSidebarTab | 1291 |
| public/js/app.js | updateSidebarTabsUI | 1326 |
| public/js/app.js | toggleChatInputVisibility | 1340 |
| public/js/app.js | updateDirectStreakBadge | 1353 |
| public/js/app.js | selectGeneralChat | 1374 |
| public/js/app.js | selectDirectChat | 1396 |
| public/js/app.js | selectGroupChat | 1438 |
| public/js/app.js | loadGroups | 1508 |
| public/js/app.js | renderGroupsList | 1531 |
| public/js/app.js | openCreateGroupModal | 1609 |
| public/js/app.js | setGroupIcon | 1630 |
| public/js/app.js | renderGroupMembersCheckboxes | 1635 |
| public/js/app.js | filterGroupMembersList | 1676 |
| public/js/app.js | updateSelectedMembersCount | 1680 |
| public/js/app.js | toggleSelectAllGroupMembers | 1688 |
| public/js/app.js | handleCreateGroupSubmit | 1699 |
| public/js/app.js | handleDeleteCurrentGroup | 1755 |
| public/js/app.js | renderGroupLockedView | 1782 |
| public/js/app.js | sendGroupJoinRequest | 1864 |
| public/js/app.js | openGroupJoinRequestsModal | 1910 |
| public/js/app.js | loadGroupJoinRequests | 1927 |
| public/js/app.js | handleRespondJoinRequest | 1993 |
| public/js/app.js | openGroupMembersModal | 2032 |
| public/js/app.js | loadMessages | 2091 |
| public/js/app.js | renderMessagesFeed | 2133 |
| public/js/app.js | formatMessageHTML | 2166 |
| public/js/app.js | renderReactionsPills | 2277 |
| public/js/app.js | appendMessageBubble | 2292 |
| public/js/app.js | deleteChatMessage | 2314 |
| public/js/app.js | scrollToBottom | 2331 |
| public/js/app.js | handleSendMessage | 2338 |
| public/js/app.js | sendChatMessagePayload | 2358 |
| public/js/app.js | toggleReaction | 2389 |
| public/js/app.js | renderMessageReactions | 2398 |
| public/js/app.js | toggleVoiceRecording | 2408 |
| public/js/app.js | cancelVoiceRecording | 2473 |
| public/js/app.js | toggleAudioPlay | 2484 |
| public/js/app.js | loadStories | 2517 |
| public/js/app.js | renderStoriesBar | 2528 |
| public/js/app.js | viewUserStories | 2562 |
| public/js/app.js | renderCurrentStory | 2572 |
| public/js/app.js | deleteCurrentActiveStory | 2640 |
| public/js/app.js | nextStory | 2674 |
| public/js/app.js | prevStory | 2684 |
| public/js/app.js | updateStoryViewsDisplay | 2692 |
| public/js/app.js | openStoryViewsModal | 2701 |
| public/js/app.js | formatTimeAgo | 2758 |
| public/js/app.js | openStoryCreator | 2769 |
| public/js/app.js | handleCreateStorySubmit | 2773 |
| public/js/app.js | removeStorySelectedFile | 2805 |
| public/js/app.js | loadAirDropFiles | 2819 |
| public/js/app.js | renderAirDropList | 2830 |
| public/js/app.js | recordAirDropDownload | 2860 |
| public/js/app.js | handleAirDropUpload | 2866 |
| public/js/app.js | resizeWhiteboardCanvas | 2891 |
| public/js/app.js | initWhiteboard | 2931 |
| public/js/app.js | getCanvasPos | 3012 |
| public/js/app.js | drawStrokeOnCanvas | 3035 |
| public/js/app.js | clearLocalCanvas | 3049 |
| public/js/app.js | emitClearWhiteboard | 3058 |
| public/js/app.js | setWhiteboardColor | 3065 |
| public/js/app.js | setWhiteboardBrushSize | 3070 |
| public/js/app.js | setWhiteboardEraser | 3074 |
| public/js/app.js | exportWhiteboardImage | 3078 |
| public/js/app.js | openCodepadModal | 3090 |
| public/js/app.js | updateCodePadStats | 3114 |
| public/js/app.js | handleCodePadInput | 3124 |
| public/js/app.js | copyAllCodePadText | 3150 |
| public/js/app.js | clearCodePadText | 3160 |
| public/js/app.js | shareCodePadToChat | 3174 |
| public/js/app.js | openCodeSnippetModal | 3190 |
| public/js/app.js | handleCodeSnippetSubmit | 3198 |
| public/js/app.js | copySnippetCode | 3226 |
| public/js/app.js | copyTextToClipboard | 3239 |
| public/js/app.js | handleTextareaTabKey | 3280 |
| public/js/app.js | toggleScreenShare | 3297 |
| public/js/app.js | startScreenShare | 3311 |
| public/js/app.js | stopScreenShare | 3373 |
| public/js/app.js | joinScreenShare | 3395 |
| public/js/app.js | closeScreenShareView | 3451 |
| public/js/app.js | handleScreenShareControlClick | 3461 |
| public/js/app.js | openScreenSharePanel | 3469 |
| public/js/app.js | closeScreenSharePanel | 3485 |
| public/js/app.js | updateScreenShareHeaderButton | 3496 |
| public/js/app.js | toggleScreenShareFullscreen | 3524 |
| public/js/app.js | toggleScreenSharePiP | 3538 |
| public/js/app.js | toggleScreenShareAudio | 3552 |
| public/js/app.js | dismissScreenShareNotification | 3563 |
| public/js/app.js | handleScreenShareStarted | 3570 |
| public/js/app.js | handleScreenShareEnded | 3587 |
| public/js/app.js | handleViewerJoined | 3602 |
| public/js/app.js | handleIncomingOffer | 3639 |
| public/js/app.js | handleIncomingAnswer | 3661 |
| public/js/app.js | handleIncomingIceCandidate | 3673 |
| public/js/app.js | switchMusicModalTab | 3692 |
| public/js/app.js | openHolyQuranRadioModal | 3743 |
| public/js/app.js | openHolyQuranOfficialSite | 3748 |
| public/js/app.js | toggleBroadcastQuranRadio | 3752 |
| public/js/app.js | loadQuranLibraryPickers | 3756 |
| public/js/app.js | selectQuranReciter | 3794 |
| public/js/app.js | getSelectedQuranChoice | 3804 |
| public/js/app.js | broadcastQuranLibrarySelection | 3812 |
| public/js/app.js | stopQuranLibraryBroadcast | 3832 |
| public/js/app.js | getLocalOnlyAudioElement | 3845 |
| public/js/app.js | playLocalOnlyAudio | 3853 |
| public/js/app.js | showLocalOnlyBar | 3860 |
| public/js/app.js | hideLocalOnlyBar | 3880 |
| public/js/app.js | stopLocalOnlyAudio | 3885 |
| public/js/app.js | playQuranLibraryLocalOnly | 3893 |
| public/js/app.js | handleRadioAudioError | 3903 |
| public/js/app.js | openMusicModal | 3938 |
| public/js/app.js | loadMusicLibraryCountOnly | 3944 |
| public/js/app.js | quickSearchOnline | 3954 |
| public/js/app.js | handleOnlineMusicSearchInput | 3963 |
| public/js/app.js | searchOnlineMusic | 3971 |
| public/js/app.js | renderOnlineMusicResults | 4013 |
| public/js/app.js | playOnlineSongForEveryone | 4069 |
| public/js/app.js | shareOnlineTrackToChat | 4130 |
| public/js/app.js | handleMusicSearchInput | 4144 |
| public/js/app.js | loadMusicLibrary | 4151 |
| public/js/app.js | renderMusicResults | 4179 |
| public/js/app.js | playTrackForEveryoneByIndex | 4242 |
| public/js/app.js | shareTrackToChatByIndex | 4266 |
| public/js/app.js | handleRadioFileUpload | 4279 |
| public/js/app.js | deleteLibraryMusic | 4328 |
| public/js/app.js | handleRadioSyncState | 4350 |
| public/js/app.js | showAutoplayUnlockBanner | 4464 |
| public/js/app.js | hideAutoplayUnlockBanner | 4473 |
| public/js/app.js | unlockAudioAutoplay | 4478 |
| public/js/app.js | getRadioAudioElement | 4488 |
| public/js/app.js | updateRadioProgressUI | 4516 |
| public/js/app.js | handleRadioProgressInput | 4542 |
| public/js/app.js | toggleRadioPlayPause | 4553 |
| public/js/app.js | closeRadioBar | 4574 |
| public/js/app.js | formatAudioSeconds | 4585 |
| public/js/app.js | openAdminDashboard | 4595 |
| public/js/app.js | renderAdminDashboard | 4612 |
| public/js/app.js | adminBroadcastAlert | 4648 |
| public/js/app.js | adminStealthRelease | 4662 |
| public/js/app.js | adminToggleFocusMode | 4674 |
| public/js/app.js | adminKickUser | 4690 |
| public/js/app.js | adminDeleteMessage | 4703 |
| public/js/app.js | showModal | 4718 |
| public/js/app.js | hideModal | 4746 |
| public/js/app.js | showNotification | 4758 |
| public/js/app.js | showAnnouncementModal | 4768 |
| public/js/app.js | showTypingIndicator | 4778 |
| public/js/app.js | hideTypingIndicator | 4786 |
| public/js/app.js | setDisappearingTimer | 4791 |
| public/js/app.js | escapeHtml | 4805 |
| public/js/app.js | connectToEnteredHost | 4816 |
| public/js/app.js | setupEventListeners | 4838 |
| public/js/app.js | logoutCurrentUser | 5083 |
| public/js/app.js | openNetSupportModal | 5094 |
| public/js/app.js | refreshNetSupportDevices | 5106 |
| public/js/app.js | renderNetSupportGrid | 5134 |
| public/js/app.js | promptMessageToNetSupportDevice | 5256 |
| public/js/app.js | openNetSupportShowModal | 5263 |
| public/js/app.js | toggleCurrentShowLock | 5306 |
| public/js/app.js | sendMsgToCurrentShowDevice | 5329 |
| public/js/app.js | triggerAlarmCurrentShowDevice | 5336 |
| public/js/app.js | adminNetSupportDeviceControl | 5344 |
| public/js/app.js | adminNetSupportGlobalAction | 5364 |
| public/js/app.js | openNetSupportAgentGuideModal | 5383 |
| public/js/app.js | handleNetSupportFrameUpdate | 5388 |
| public/js/app.js | captureStudentLiveSnapshot | 5451 |
| public/js/app.js | startStudentAutoScreenStream | 5530 |
| public/js/app.js | promptStudentNetSupportScreenShare | 5558 |
| public/js/app.js | calculateAlexandriaPrayersClient | 5567 |
| public/js/app.js | getHA | 5604 |
| public/js/app.js | fmt | 5619 |
| public/js/app.js | tickAlexandriaClockAndPrayers | 5649 |
| public/js/app.js | initAlexandriaPrayerEngine | 5795 |
| public/js/app.js | switchTimetableTab | 5815 |
| public/js/app.js | openSchoolScheduleModal | 5836 |
| public/js/app.js | openPrayerTimesModal | 5842 |
| public/js/app.js | playTasbeehBeadClick | 5877 |
| public/js/app.js | playTasbeehGoalChime | 5901 |
| public/js/app.js | loadTasbeehStats | 5924 |
| public/js/app.js | saveTasbeehStats | 5938 |
| public/js/app.js | renderTasbeehDhikrList | 5950 |
| public/js/app.js | updateTasbeehUI | 5968 |
| public/js/app.js | incrementTasbeeh | 6023 |
| public/js/app.js | resetCurrentTasbeeh | 6080 |
| public/js/app.js | setTasbeehTarget | 6088 |
| public/js/app.js | selectTasbeehDhikr | 6094 |
| public/js/app.js | toggleTasbeehSound | 6107 |
| public/js/app.js | openTasbeehModal | 6113 |
| public/js/app.js | initTasbeehEngine | 6120 |
| public/js/app.js | calculateSchoolSchedule | 6150 |
| public/js/app.js | fmtRemaining | 6200 |
| public/js/app.js | updateSchoolScheduleUI | 6308 |
| public/js/app.js | unlockAllPreloadedAudioOnce | 6460 |
| public/js/app.js | selectSalawatVoice | 6485 |
| public/js/app.js | testSalawatAudioVoice | 6500 |
| public/js/app.js | playDhikrAudioPhrase | 6504 |
| public/js/app.js | showDhikrFloatingToast | 6524 |
| public/js/app.js | playSalawatVoice | 6546 |
| public/js/app.js | playSalawatBellChime | 6575 |
| public/js/app.js | handleSalawatBroadcast | 6581 |
| public/js/app.js | triggerClassroomSalawat | 6606 |
| public/js/audio_synth.js | SoundEngine | 2 |
| public/stealth/flutter.html | renderCompleteSection | 519 |
| public/stealth/flutter.html | renderCorrectSection | 541 |
| public/stealth/flutter.html | renderTermsSection | 563 |
| public/stealth/flutter.html | renderExplainSection | 585 |
| public/stealth/flutter.html | renderTFSection | 618 |
| public/stealth/flutter.html | renderMCQSection | 645 |
| public/stealth/flutter.html | updateScoreHeader | 671 |
| public/stealth/flutter.html | checkComplete | 680 |
| public/stealth/flutter.html | revealComplete | 714 |
| public/stealth/flutter.html | checkCorrection | 719 |
| public/stealth/flutter.html | revealCorrection | 753 |
| public/stealth/flutter.html | checkTerm | 758 |
| public/stealth/flutter.html | revealTerm | 792 |
| public/stealth/flutter.html | checkExplain | 798 |
| public/stealth/flutter.html | revealExplain | 836 |
| public/stealth/flutter.html | answerTF | 841 |
| public/stealth/flutter.html | answerMCQ | 880 |
| public/stealth/flutter.html | toggleAllAnswers | 932 |
| public/stealth/flutter.html | resetQuiz | 963 |
| public/stealth/flutter.html | renderAllSections | 975 |
| public/stealth/flutter.html | unlockStealthLocal | 1010 |
| public/stealth/physics.html | escapeHtml | 261 |
| public/stealth/physics.html | getCurrentNo2taUser | 267 |
| public/stealth/physics.html | submitQuizScoreIfComplete | 274 |
| public/stealth/physics.html | toggleLeaderboard | 294 |
| public/stealth/physics.html | loadLeaderboard | 302 |
| public/stealth/physics.html | renderCompleteSection | 601 |
| public/stealth/physics.html | renderCorrectSection | 623 |
| public/stealth/physics.html | renderTermsSection | 645 |
| public/stealth/physics.html | renderExplainSection | 667 |
| public/stealth/physics.html | renderTFSection | 700 |
| public/stealth/physics.html | renderMCQSection | 727 |
| public/stealth/physics.html | updateScoreHeader | 753 |
| public/stealth/physics.html | checkComplete | 763 |
| public/stealth/physics.html | revealComplete | 797 |
| public/stealth/physics.html | checkCorrection | 802 |
| public/stealth/physics.html | revealCorrection | 836 |
| public/stealth/physics.html | checkTerm | 841 |
| public/stealth/physics.html | revealTerm | 875 |
| public/stealth/physics.html | checkExplain | 881 |
| public/stealth/physics.html | revealExplain | 919 |
| public/stealth/physics.html | answerTF | 924 |
| public/stealth/physics.html | answerMCQ | 963 |
| public/stealth/physics.html | toggleAllAnswers | 1015 |
| public/stealth/physics.html | resetQuiz | 1046 |
| public/stealth/physics.html | renderAllSections | 1059 |
| public/stealth/physics.html | unlockStealthLocal | 1094 |
| server.js | isHostAdmin | 39 |
| server.js | getAlexandriaPrayers | 155 |
| server.js | getHA | 192 |
| server.js | fmt | 207 |
| server.js | saveTasbeehCount | 281 |
| server.js | checkAndTriggerSalawatBroadcast | 294 |
| server.js | quranRelayWriteChunk | 355 |
| server.js | scheduleQuranReconnect | 361 |
| server.js | connectQuranUpstream | 374 |
| server.js | startQuranRelay | 403 |
| server.js | stopQuranRelay | 412 |
| server.js | buildQuranLibraryTrack | 567 |
| server.js | advanceQuranSurah | 614 |
| server.js | fetchJsonOnline | 1578 |
| server.js | downloadMediaViaProxy | 1597 |
| server.js | decryptSaavnUrl | 1637 |
| server.js | searchOnlineSongs | 1660 |
| server.js | resolveStudentInfo | 2183 |
| server.js | generateMathQuestions | 2505 |
| server.js | startMathGame | 2526 |
| server.js | nextMathQuestion | 2534 |
| server.js | startServer | 3165 |
| services/discovery.js | startBeacon | 4 |
| services/network.js | cleanIP | 5 |
| services/network.js | getServerLanIPs | 18 |
| services/network.js | resolveMacAddress | 38 |
| services/streaks.js | getLocalDateString | 5 |
| services/streaks.js | isWeekendFreeze | 13 |
| services/streaks.js | getOrderedPair | 19 |
| services/streaks.js | recordInteraction | 23 |
| services/streaks.js | getStreakBetween | 103 |
| services/streaks.js | getAllUserStreaks | 114 |

### عناصر DOM ذات id

| الملف | id | السطر |
|---|---|---:|
| public/index.html | appFavicon | 7 |
| public/index.html | screenShareToggleBtn | 108 |
| public/index.html | screenShareBtnLabel | 110 |
| public/index.html | screenShareLiveDot | 111 |
| public/index.html | quranRadioBroadcastBtn | 115 |
| public/index.html | quranRadioBtnText | 117 |
| public/index.html | quranRadioLiveIndicator | 118 |
| public/index.html | radioToggleBtn | 122 |
| public/index.html | radioPlayingIndicator | 125 |
| public/index.html | weekendFreezeBadge | 141 |
| public/index.html | onlineCountBadge | 145 |
| public/index.html | alexandriaHeaderPill | 151 |
| public/index.html | headerAlexandriaClock | 154 |
| public/index.html | headerSchoolStatusBadge | 157 |
| public/index.html | headerSchoolBreakCountdown | 158 |
| public/index.html | netSupportBtn | 162 |
| public/index.html | netSupportOnlineCount | 165 |
| public/index.html | adminDashboardBtn | 169 |
| public/index.html | myAvatar | 176 |
| public/index.html | myNickname | 178 |
| public/index.html | myRoleBadge | 179 |
| public/index.html | panicTriggerBtn | 186 |
| public/index.html | standaloneLocalhostBanner | 196 |
| public/index.html | storiesList | 209 |
| public/index.html | tabGeneralBtn | 222 |
| public/index.html | tabGroupsBtn | 226 |
| public/index.html | groupsCountBadge | 229 |
| public/index.html | tabDirectBtn | 231 |
| public/index.html | sidebarAlexandriaWidget | 239 |
| public/index.html | sidebarAlexandriaDate | 248 |
| public/index.html | sidebarAlexandriaClock | 252 |
| public/index.html | sidebarAlexandriaNextCountdown | 253 |
| public/index.html | prayer_card_fajr | 259 |
| public/index.html | prayer_time_fajr | 261 |
| public/index.html | prayer_card_dhuhr | 263 |
| public/index.html | prayer_time_dhuhr | 265 |
| public/index.html | prayer_card_asr | 267 |
| public/index.html | prayer_time_asr | 269 |
| public/index.html | prayer_card_maghrib | 271 |
| public/index.html | prayer_time_maghrib | 273 |
| public/index.html | prayer_card_isha | 275 |
| public/index.html | prayer_time_isha | 277 |
| public/index.html | sidebarSchoolSessionBadge | 286 |
| public/index.html | sidebarSchoolSessionCountdown | 288 |
| public/index.html | sidebarSchoolBreakCountdown | 295 |
| public/index.html | sidebarSchoolBionicLabel | 298 |
| public/index.html | sidebarSchoolBionicCountdown | 299 |
| public/index.html | sidebarSchoolDismissalLabel | 302 |
| public/index.html | sidebarSchoolDismissalCountdown | 303 |
| public/index.html | sidebarSectionTitle | 317 |
| public/index.html | sidebarSectionAction | 318 |
| public/index.html | usersListContainer | 324 |
| public/index.html | groupsListContainer | 329 |
| public/index.html | currentChatAvatar | 340 |
| public/index.html | currentChatTitle | 345 |
| public/index.html | directStreakBadge | 346 |
| public/index.html | currentChatSubtitle | 350 |
| public/index.html | groupHeaderControls | 357 |
| public/index.html | groupHeaderJoinRequestsBtn | 358 |
| public/index.html | groupHeaderJoinRequestsCount | 361 |
| public/index.html | groupHeaderMembersCount | 366 |
| public/index.html | groupHeaderDeleteBtn | 368 |
| public/index.html | disappearingToggleBtn | 374 |
| public/index.html | screenShareJoinNotification | 392 |
| public/index.html | screenShareJoinText | 395 |
| public/index.html | screenShareTheaterPanel | 409 |
| public/index.html | screenSharePresenterName | 416 |
| public/index.html | screenShareStatusPill | 418 |
| public/index.html | screenShareAudioToggleBtn | 424 |
| public/index.html | screenShareAudioIconOn | 425 |
| public/index.html | screenShareAudioIconOff | 426 |
| public/index.html | screenShareControlBtn | 439 |
| public/index.html | screenShareControlBtnText | 441 |
| public/index.html | screenShareVideoWrapper | 447 |
| public/index.html | screenShareVideo | 448 |
| public/index.html | screenShareLoadingOverlay | 451 |
| public/index.html | chatFocusBanner | 459 |
| public/index.html | messagesContainer | 465 |
| public/index.html | chatTypingIndicator | 470 |
| public/index.html | voiceRecordBanner | 475 |
| public/index.html | voiceTimerText | 479 |
| public/index.html | voiceCancelBtn | 482 |
| public/index.html | chatInputBarContainer | 488 |
| public/index.html | groupLockedNoticeBar | 489 |
| public/index.html | chatForm | 493 |
| public/index.html | chatFileInput | 498 |
| public/index.html | messageInput | 506 |
| public/index.html | voiceRecordBtn | 509 |
| public/index.html | sendMsgBtn | 514 |
| public/index.html | stealthPhysicsOverlay | 526 |
| public/index.html | stealthGlobalUnlockBtn | 540 |
| public/index.html | stealthIframe | 546 |
| public/index.html | authModal | 554 |
| public/index.html | authForm | 564 |
| public/index.html | authPassword | 567 |
| public/index.html | authNickname | 572 |
| public/index.html | authAvatarCustomPreview | 581 |
| public/index.html | authAvatarFileInput | 593 |
| public/index.html | authError | 607 |
| public/index.html | networkModal | 618 |
| public/index.html | networkQrImg | 625 |
| public/index.html | networkHostUrl | 628 |
| public/index.html | clientDetectedIp | 631 |
| public/index.html | clientDetectedMac | 632 |
| public/index.html | airdropModal | 638 |
| public/index.html | airdropDropZone | 649 |
| public/index.html | airdropFileInput | 653 |
| public/index.html | airdropUploadProgress | 656 |
| public/index.html | airdropFilesList | 662 |
| public/index.html | whiteboardModal | 669 |
| public/index.html | whiteboardCanvas | 704 |
| public/index.html | codepadModal | 710 |
| public/index.html | codepadStats | 723 |
| public/index.html | copyAllCodepadBtn | 729 |
| public/index.html | sharedCodePadTextarea | 752 |
| public/index.html | codepadSyncIndicator | 761 |
| public/index.html | codeSnippetModal | 770 |
| public/index.html | codeSnippetForm | 782 |
| public/index.html | snippetTitleInput | 786 |
| public/index.html | snippetLanguageSelect | 790 |
| public/index.html | snippetCodeInput | 806 |
| public/index.html | storyCreatorModal | 823 |
| public/index.html | storyCreateForm | 828 |
| public/index.html | storyTextInput | 831 |
| public/index.html | storyDropZone | 846 |
| public/index.html | storyFileEmptyState | 847 |
| public/index.html | storyFilePreviewState | 852 |
| public/index.html | storyImagePreview | 853 |
| public/index.html | storyFileInput | 858 |
| public/index.html | storyViewerModal | 870 |
| public/index.html | storyViewerAvatar | 875 |
| public/index.html | storyViewerName | 877 |
| public/index.html | storyViewersBadge | 878 |
| public/index.html | deleteStoryBtn | 884 |
| public/index.html | storyViewerBody | 893 |
| public/index.html | storyViewersBottomBtnText | 903 |
| public/index.html | storyViewsModal | 916 |
| public/index.html | storyViewsModalCount | 922 |
| public/index.html | storyViewersList | 927 |
| public/index.html | adminModal | 934 |
| public/index.html | adminQuranRadioBtn | 946 |
| public/index.html | adminQuranRadioBtnText | 948 |
| public/index.html | adminToggleFocusBtn | 953 |
| public/index.html | adminDevicesTable | 974 |
| public/index.html | announcementModal | 983 |
| public/index.html | announcementTitle | 986 |
| public/index.html | announcementText | 987 |
| public/index.html | announcementTime | 988 |
| public/index.html | profileModal | 996 |
| public/index.html | profileEditForm | 1001 |
| public/index.html | editNickname | 1004 |
| public/index.html | editBio | 1009 |
| public/index.html | editAvatarCustomPreview | 1018 |
| public/index.html | editAvatarFileInput | 1030 |
| public/index.html | connectHostModal | 1057 |
| public/index.html | targetHostIpInput | 1069 |
| public/index.html | classroomMusicBar | 1085 |
| public/index.html | radioCoverWrapper | 1089 |
| public/index.html | radioDefaultCover | 1090 |
| public/index.html | radioTrackTitle | 1093 |
| public/index.html | radioTrackArtist | 1094 |
| public/index.html | quranExternalLinkBtn | 1100 |
| public/index.html | radioPlayPauseBtn | 1103 |
| public/index.html | radioPlayIcon | 1104 |
| public/index.html | radioCurrentTime | 1118 |
| public/index.html | radioProgressBar | 1119 |
| public/index.html | radioTotalDuration | 1120 |
| public/index.html | classroomAudioElement | 1122 |
| public/index.html | musicAutoplayUnlockBanner | 1126 |
| public/index.html | musicAutoplayTrackTitle | 1129 |
| public/index.html | holyQuranRadioModal | 1137 |
| public/index.html | quranLibraryNowPlaying | 1156 |
| public/index.html | quranLibraryNowPlayingText | 1159 |
| public/index.html | quranReciterChips | 1168 |
| public/index.html | quranSurahSelect | 1174 |
| public/index.html | musicSearchModal | 1193 |
| public/index.html | modalQuranRadioBtnText | 1224 |
| public/index.html | onlineMusicTabBtn | 1229 |
| public/index.html | localMusicTabBtn | 1234 |
| public/index.html | localTabCountBadge | 1237 |
| public/index.html | onlineMusicTabPanel | 1242 |
| public/index.html | onlineMusicSearchInput | 1245 |
| public/index.html | onlineMusicResultsContainer | 1263 |
| public/index.html | localMusicTabPanel | 1273 |
| public/index.html | radioAudioFileInput | 1287 |
| public/index.html | musicSearchInput | 1292 |
| public/index.html | musicLibraryCountText | 1298 |
| public/index.html | musicResultsContainer | 1306 |
| public/index.html | createGroupModal | 1317 |
| public/index.html | createGroupForm | 1334 |
| public/index.html | createGroupNameInput | 1338 |
| public/index.html | createGroupIconInput | 1345 |
| public/index.html | createGroupDescInput | 1364 |
| public/index.html | selectedMembersCountBadge | 1372 |
| public/index.html | selectAllMembersBtn | 1375 |
| public/index.html | groupMemberSearchInput | 1380 |
| public/index.html | groupMembersSelectionContainer | 1383 |
| public/index.html | submitCreateGroupBtn | 1393 |
| public/index.html | groupMembersModal | 1402 |
| public/index.html | groupInfoModalIcon | 1406 |
| public/index.html | groupInfoModalTitle | 1408 |
| public/index.html | groupInfoModalDesc | 1409 |
| public/index.html | groupMembersListModalContainer | 1415 |
| public/index.html | groupJoinRequestsModal | 1422 |
| public/index.html | groupJoinRequestsSubtitle | 1429 |
| public/index.html | groupJoinRequestsListContainer | 1435 |
| public/index.html | studentLockScreenOverlay | 1442 |
| public/index.html | studentLockReasonText | 1453 |
| public/index.html | studentDirectWarningModal | 1462 |
| public/index.html | studentDirectWarningTitle | 1465 |
| public/index.html | studentDirectWarningMsg | 1466 |
| public/index.html | studentDirectWarningTime | 1467 |
| public/index.html | netSupportModal | 1475 |
| public/index.html | netSupportStatsTotal | 1509 |
| public/index.html | netSupportStatsScreens | 1513 |
| public/index.html | netSupportGridContainer | 1533 |
| public/index.html | netSupportShowModal | 1540 |
| public/index.html | netSupportShowAvatar | 1544 |
| public/index.html | netSupportShowTitle | 1546 |
| public/index.html | netSupportShowSubtitle | 1547 |
| public/index.html | netSupportShowLockBtn | 1551 |
| public/index.html | netSupportShowLockLabel | 1553 |
| public/index.html | netSupportShowImage | 1569 |
| public/index.html | netSupportShowPlaceholder | 1570 |
| public/index.html | netSupportAgentGuideModal | 1579 |
| public/index.html | prayerTimesModal | 1621 |
| public/index.html | tabBtnSchoolSchedule | 1632 |
| public/index.html | tabBtnPrayerTimes | 1636 |
| public/index.html | tabContentSchoolSchedule | 1643 |
| public/index.html | modalSchoolCurrentStatus | 1650 |
| public/index.html | modalSchoolSessionInfo | 1651 |
| public/index.html | modalSchoolSessionTimer | 1654 |
| public/index.html | modalSchoolBreakTimer | 1660 |
| public/index.html | modalSchoolBionicHeader | 1663 |
| public/index.html | modalSchoolBionicTimer | 1664 |
| public/index.html | modalSchoolDismissalHeader | 1667 |
| public/index.html | modalSchoolDismissalTimer | 1668 |
| public/index.html | modalScheduleDayBadge | 1680 |
| public/index.html | modalScheduleRowsContainer | 1684 |
| public/index.html | tabContentPrayerTimes | 1703 |
| public/index.html | modalAlexandriaFullDate | 1714 |
| public/index.html | modalAlexandriaLiveClock | 1724 |
| public/index.html | modalNextPrayerName | 1729 |
| public/index.html | modalNextPrayerCountdown | 1730 |
| public/index.html | modal_row_fajr | 1736 |
| public/index.html | modal_time_fajr | 1741 |
| public/index.html | modal_row_sunrise | 1743 |
| public/index.html | modal_time_sunrise | 1748 |
| public/index.html | modal_row_dhuhr | 1750 |
| public/index.html | modal_time_dhuhr | 1755 |
| public/index.html | modal_row_asr | 1757 |
| public/index.html | modal_time_asr | 1762 |
| public/index.html | modal_row_maghrib | 1764 |
| public/index.html | modal_time_maghrib | 1769 |
| public/index.html | modal_row_isha | 1771 |
| public/index.html | modal_time_isha | 1776 |
| public/index.html | tasbeehModal | 1798 |
| public/index.html | tasbeehSoundToggleBtn | 1814 |
| public/index.html | tasbeehSoundIconOn | 1815 |
| public/index.html | tasbeehSoundIconOff | 1816 |
| public/index.html | tasbeehClassroomTotal | 1828 |
| public/index.html | tasbeehDhikrList | 1832 |
| public/index.html | tasbeehCounterCircle | 1838 |
| public/index.html | tasbeehProgressCircle | 1842 |
| public/index.html | tasbeehCurrentDhikrTitle | 1847 |
| public/index.html | tasbeehCountDisplay | 1848 |
| public/index.html | tasbeehTargetDisplay | 1851 |
| public/index.html | targetBtn_33 | 1862 |
| public/index.html | targetBtn_100 | 1863 |
| public/index.html | targetBtn_0 | 1864 |
| public/index.html | tasbeehCycleCount | 1870 |
| public/index.html | tasbeehTodayCount | 1882 |
| public/index.html | tasbeehLifetimeCount | 1883 |
| public/index.html | voiceOpt_voice1 | 1899 |
| public/index.html | voiceOpt_voice2 | 1902 |
| public/index.html | voiceOpt_voice3 | 1905 |
| public/index.html | mathGameModal | 1920 |
| public/index.html | mathGameIdleView | 1938 |
| public/index.html | mathGameQuestionView | 1947 |
| public/index.html | mathGameProgress | 1949 |
| public/index.html | mathGameRoundResult | 1950 |
| public/index.html | mathGameQuestionText | 1953 |
| public/index.html | mathGameAnswerInput | 1956 |
| public/index.html | mathGameLiveScores | 1959 |
| public/index.html | mathGameFinishedView | 1963 |
| public/index.html | mathGameFinalScores | 1968 |
| public/index.html | globalSalawatBanner | 1978 |
| public/index.html | globalNotificationPill | 1990 |
| public/index.html | globalNotificationMsg | 1992 |
| public/stealth/flutter.html | score-display | 39 |
| public/stealth/flutter.html | total-questions-display | 41 |
| public/stealth/flutter.html | correct-count | 45 |
| public/stealth/flutter.html | wrong-count | 49 |
| public/stealth/flutter.html | percentage-badge | 51 |
| public/stealth/flutter.html | toggle-answers-btn | 54 |
| public/stealth/flutter.html | quiz-progress-bar | 65 |
| public/stealth/flutter.html | section-complete | 101 |
| public/stealth/flutter.html | complete-score-badge | 110 |
| public/stealth/flutter.html | complete-container | 113 |
| public/stealth/flutter.html | section-correct | 122 |
| public/stealth/flutter.html | correct-score-badge | 131 |
| public/stealth/flutter.html | correct-container | 134 |
| public/stealth/flutter.html | section-terms | 143 |
| public/stealth/flutter.html | terms-score-badge | 152 |
| public/stealth/flutter.html | terms-container | 155 |
| public/stealth/flutter.html | section-explain | 164 |
| public/stealth/flutter.html | explain-score-badge | 176 |
| public/stealth/flutter.html | explain-container | 179 |
| public/stealth/flutter.html | section-tf | 188 |
| public/stealth/flutter.html | tf-score-badge | 197 |
| public/stealth/flutter.html | tf-container | 200 |
| public/stealth/flutter.html | section-mcq | 209 |
| public/stealth/flutter.html | mcq-score-badge | 218 |
| public/stealth/flutter.html | mcq-container | 221 |
| public/stealth/flutter.html | complete-status-${item.id} | 526 |
| public/stealth/flutter.html | complete-input-${item.id} | 530 |
| public/stealth/flutter.html | complete-answer-${item.id} | 534 |
| public/stealth/flutter.html | correct-status-${item.id} | 548 |
| public/stealth/flutter.html | correct-input-${item.id} | 552 |
| public/stealth/flutter.html | correct-answer-${item.id} | 556 |
| public/stealth/flutter.html | terms-status-${item.id} | 570 |
| public/stealth/flutter.html | terms-input-${item.id} | 574 |
| public/stealth/flutter.html | terms-answer-${item.id} | 578 |
| public/stealth/flutter.html | explain-status-${item.id} | 592 |
| public/stealth/flutter.html | explain-input-${item.id} | 598 |
| public/stealth/flutter.html | explain-ans-${item.id} | 610 |
| public/stealth/flutter.html | tf-status-${item.id} | 625 |
| public/stealth/flutter.html | tf-btn-true-${item.id} | 629 |
| public/stealth/flutter.html | tf-btn-false-${item.id} | 633 |
| public/stealth/flutter.html | tf-reason-${item.id} | 638 |
| public/stealth/flutter.html | mcq-status-${item.id} | 652 |
| public/stealth/flutter.html | mcq-btn-${item.id}-${opt.val} | 657 |
| public/stealth/flutter.html | mcq-icon-${item.id}-${opt.val} | 659 |
| public/stealth/flutter.html | mcq-exp-${item.id} | 663 |
| public/stealth/physics.html | score-display | 39 |
| public/stealth/physics.html | total-questions-display | 41 |
| public/stealth/physics.html | correct-count | 45 |
| public/stealth/physics.html | wrong-count | 49 |
| public/stealth/physics.html | percentage-badge | 51 |
| public/stealth/physics.html | toggle-answers-btn | 54 |
| public/stealth/physics.html | leaderboard-toggle-btn | 57 |
| public/stealth/physics.html | quiz-progress-bar | 68 |
| public/stealth/physics.html | leaderboard-panel | 72 |
| public/stealth/physics.html | leaderboard-content | 77 |
| public/stealth/physics.html | section-complete | 113 |
| public/stealth/physics.html | complete-score-badge | 122 |
| public/stealth/physics.html | complete-container | 125 |
| public/stealth/physics.html | section-correct | 134 |
| public/stealth/physics.html | correct-score-badge | 143 |
| public/stealth/physics.html | correct-container | 146 |
| public/stealth/physics.html | section-terms | 155 |
| public/stealth/physics.html | terms-score-badge | 164 |
| public/stealth/physics.html | terms-container | 167 |
| public/stealth/physics.html | section-explain | 176 |
| public/stealth/physics.html | explain-score-badge | 188 |
| public/stealth/physics.html | explain-container | 191 |
| public/stealth/physics.html | section-tf | 200 |
| public/stealth/physics.html | tf-score-badge | 209 |
| public/stealth/physics.html | tf-container | 212 |
| public/stealth/physics.html | section-mcq | 221 |
| public/stealth/physics.html | mcq-score-badge | 230 |
| public/stealth/physics.html | mcq-container | 233 |
| public/stealth/physics.html | complete-status-${item.id} | 608 |
| public/stealth/physics.html | complete-input-${item.id} | 612 |
| public/stealth/physics.html | complete-answer-${item.id} | 616 |
| public/stealth/physics.html | correct-status-${item.id} | 630 |
| public/stealth/physics.html | correct-input-${item.id} | 634 |
| public/stealth/physics.html | correct-answer-${item.id} | 638 |
| public/stealth/physics.html | terms-status-${item.id} | 652 |
| public/stealth/physics.html | terms-input-${item.id} | 656 |
| public/stealth/physics.html | terms-answer-${item.id} | 660 |
| public/stealth/physics.html | explain-status-${item.id} | 674 |
| public/stealth/physics.html | explain-input-${item.id} | 680 |
| public/stealth/physics.html | explain-ans-${item.id} | 692 |
| public/stealth/physics.html | tf-status-${item.id} | 707 |
| public/stealth/physics.html | tf-btn-true-${item.id} | 711 |
| public/stealth/physics.html | tf-btn-false-${item.id} | 715 |
| public/stealth/physics.html | tf-reason-${item.id} | 720 |
| public/stealth/physics.html | mcq-status-${item.id} | 734 |
| public/stealth/physics.html | mcq-btn-${item.id}-${opt.val} | 739 |
| public/stealth/physics.html | mcq-icon-${item.id}-${opt.val} | 741 |
| public/stealth/physics.html | mcq-exp-${item.id} | 745 |

### التخزين المحلي

| الملف | الاستدعاء | السطر |
|---|---|---:|
| public/js/app.js | localStorage.setItem('no2ta_user', JSON.stringify(STATE.user)); | 388 |
| public/js/app.js | localStorage.setItem('no2ta_user', JSON.stringify(STATE.user)); | 400 |
| public/js/app.js | localStorage.getItem('no2ta_custom_host_ip') \|\| (data.primaryLanIp !== '127.0.0.1' ? data.primaryLanIp : ''); | 418 |
| public/js/app.js | localStorage.getItem('no2ta_user'); | 426 |
| public/js/app.js | localStorage.removeItem('no2ta_user'); | 433 |
| public/js/app.js | localStorage.getItem('no2ta_device_id') \|\| undefined | 466 |
| public/js/app.js | localStorage.setItem('no2ta_user', JSON.stringify(data.user)); | 478 |
| public/js/app.js | localStorage.setItem('no2ta_device_id', data.user.device_id \|\| `dev_${Date.now()}`); | 479 |
| public/js/app.js | localStorage.removeItem('no2ta_user'); | 944 |
| public/js/app.js | localStorage.setItem('no2ta_custom_host_ip', host); | 4831 |
| public/js/app.js | localStorage.setItem('no2ta_user', JSON.stringify(data.user)); | 4951 |
| public/js/app.js | localStorage.removeItem('no2ta_user'); | 5085 |
| public/js/app.js | localStorage.getItem('no2ta_tasbeeh_stats') \|\| '{}'); | 5926 |
| public/js/app.js | localStorage.setItem('no2ta_tasbeeh_stats', JSON.stringify({ | 5941 |
| public/stealth/physics.html | localStorage.getItem('no2ta_user'); | 269 |

### قيم Design Tokens

~~~css
    --no2ta-bg-canvas: #0B0A09;
    --no2ta-bg-surface: #161310;
    --no2ta-bg-surface-raised: #1F1A15;
    --no2ta-bg-surface-sunken: #060504;
    --no2ta-bg-overlay-scrim: rgba(5, 4, 3, 0.78);
    --no2ta-border-subtle: rgba(214, 178, 110, 0.08);
    --no2ta-border-default: rgba(214, 178, 110, 0.16);
    --no2ta-border-strong: rgba(214, 178, 110, 0.32);
    --no2ta-border-accent: rgba(214, 178, 110, 0.5);
    --no2ta-text-primary: #F5EFE4;
    --no2ta-text-secondary: #B8AC97;
    --no2ta-text-tertiary: #7C7363;
    --no2ta-text-disabled: rgba(124, 115, 99, 0.5);
    --no2ta-text-on-accent: #1A1308;
    --no2ta-primary-50: #FBF3E3;
    --no2ta-primary-300: #E8C988;
    --no2ta-primary-500: #D6B26E;
    --no2ta-primary-600: #C49A4E;
    --no2ta-primary-700: #A67E39;
    --no2ta-primary-surface: rgba(214, 178, 110, 0.12);
    --no2ta-secondary-300: #AAB8A0;
    --no2ta-secondary-500: #8A9A8C;
    --no2ta-secondary-600: #71806F;
    --no2ta-secondary-surface: rgba(138, 154, 140, 0.14);
    --no2ta-success-500: #7FAE63;
    --no2ta-success-surface: rgba(127, 174, 99, 0.14);
    --no2ta-warning-500: #E08A3C;
    --no2ta-warning-surface: rgba(224, 138, 60, 0.14);
    --no2ta-danger-500: #E0604A;
    --no2ta-danger-surface: rgba(224, 96, 74, 0.14);
    --no2ta-info-500: #6FA8C9;
    --no2ta-info-surface: rgba(111, 168, 201, 0.14);
    --no2ta-tag-comms: #D6B26E;
    --no2ta-tag-collab: #7C8FBD;
    --no2ta-tag-media: #C98BA0;
    --no2ta-tag-faith: #B5693F;
    --no2ta-tag-broadcast: #6E8CA6;
    --no2ta-tag-admin: #CC7A3D;
    --no2ta-font-arabic: 'Cairo', sans-serif;
    --no2ta-font-latin: 'Plus Jakarta Sans', sans-serif;
    --no2ta-font-mono: 'JetBrains Mono', ui-monospace, monospace;

    --no2ta-text-display: 1.75rem;   /* 28px */
    --no2ta-text-h1: 1.25rem;        /* 20px */
    --no2ta-text-h2: 1rem;           /* 16px */
    --no2ta-text-body-lg: 0.9375rem; /* 15px */
    --no2ta-text-body: 0.8125rem;    /* 13px */
    --no2ta-text-caption: 0.75rem;   /* 12px */
    --no2ta-text-micro: 0.656rem;    /* 10.5px — absolute floor, never smaller */
    --no2ta-radius-xs: 8px;
    --no2ta-radius-sm: 10px;
    --no2ta-radius-md: 14px;
    --no2ta-radius-lg: 20px;
    --no2ta-radius-xl: 28px;
    --no2ta-radius-full: 9999px;
    --no2ta-shadow-1: 0 1px 2px rgba(0, 0, 0, 0.4);
    --no2ta-shadow-2: 0 6px 16px rgba(0, 0, 0, 0.45);
    --no2ta-shadow-3: 0 20px 50px -12px rgba(0, 0, 0, 0.6);
    --no2ta-shadow-glow-accent: 0 0 0 1px var(--no2ta-border-accent), 0 4px 20px rgba(214, 178, 110, 0.25);
    --no2ta-duration-fast: 120ms;
    --no2ta-duration-base: 200ms;
    --no2ta-duration-slow: 320ms;
    --no2ta-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
    --no2ta-icon-sm: 15px;
    --no2ta-icon-md: 17px;
    --no2ta-icon-lg: 20px;
    --no2ta-icon-stroke: 2;
~~~

### المراجع الخارجية الثابتة في الكود

القيم قد تحتوي placeholders أو query templates؛ الغرض حصر التبعيات لا ضمان صلاحية الروابط.

| الملف | المرجع |
|---|---|
| Start_No2ta.bat | `https://nodejs.org` |
| Start_No2ta.bat | `http://192.168.20.54:5000` |
| Start_No2ta.bat | `http://localhost:5000` |
| data/quran-reciters.js | `https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/` |
| data/quran-reciters.js | `https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r3/` |
| data/quran-reciters.js | `https://cdn.mp3quran.net/audio/mahmoud-husary/r5/` |
| data/quran-reciters.js | `https://cdn.mp3quran.net/audio/abdulrahman-sudais/r1/` |
| data/quran-reciters.js | `https://cdn.mp3quran.net/audio/mishary-alafasy/r1/` |
| data/quran-reciters.js | `https://cdn.mp3quran.net/audio/maher-muaiqly/r1/` |
| data/quran-reciters.js | `https://cdn.mp3quran.net/audio/muhammad-ayyub/r1/` |
| data/quran-reciters.js | `https://cdn.mp3quran.net/audio/yasser-dosari/r1/` |
| docs/design-direction-preview-v2.html | `https://unpkg.com/lucide@latest` |
| docs/design-direction-preview-v2.html | `https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap` |
| docs/design-system-preview.html | `https://fonts.googleapis.com` |
| docs/design-system-preview.html | `https://fonts.gstatic.com` |
| docs/design-system-preview.html | `https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap` |
| install-student-agent.bat | `http://$($j.hostIp):$($j.port)\` |
| lab-agent.ps1 | `http://$($json.hostIp):$($json.port)` |
| lab-agent.ps1 | `http://192.168.20.54:5000` |
| public/agent/install-student-agent.bat | `http://$($j.hostIp):$($j.port)\` |
| public/agent/lab-agent.ps1 | `http://$($json.hostIp):$($json.port)` |
| public/agent/lab-agent.ps1 | `http://192.168.20.54:5000` |
| public/css/style.css | `https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap` |
| public/index.html | `http://www.w3.org/2000/svg%22` |
| public/index.html | `https://cdn.tailwindcss.com` |
| public/index.html | `https://unpkg.com/lucide@latest` |
| public/index.html | `https://www.holyquranradio.com/` |
| public/js/app.js | `stun:stun.l.google.com:19302` |
| public/js/app.js | `http://${data.primaryLanIp}:${data.port}` |
| public/js/app.js | `http://www.w3.org/2000/svg%22` |
| public/js/app.js | `https://www.holyquranradio.com/` |
| public/js/app.js | `http://${host}:${port}` |
| public/stealth/flutter.html | `https://cdn.tailwindcss.com` |
| public/stealth/flutter.html | `https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap` |
| public/stealth/physics.html | `https://cdn.tailwindcss.com` |
| public/stealth/physics.html | `https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap` |
| server.js | `http://${primaryLan.address}:${PORT}` |
| server.js | `https://translate.google.com/translate_tts?ie=UTF-8&q=` |
| server.js | `https://stream.radiojar.com/8s5u5tpdtwzuv` |
| server.js | `http://n12.radiojar.com/8s5u5tpdtwzuv` |
| server.js | `http://n0e.radiojar.com/8s5u5tpdtwzuv` |
| server.js | `https://stream.zeno.fm/8t42gV/qrc` |
| server.js | `http://66.45.232.131:9994/;stream.mp3` |
| server.js | `https://www.holyquranradio.com` |
| server.js | `https://api.misrquran.gov.eg` |
| server.js | `https://mp3quran.net/api/v3/radios?language=ar` |
| server.js | `https://de1.api.radio-browser.info/json/stations/byname/Quran%20Cairo` |
| server.js | `https://vercel-proxycors.vercel.app/?url=` |
| server.js | `https://corsproxy-gateway.vercel.app/?url=` |
| server.js | `https://soulsync-backend-a5fs.onrender.com/api/search?q=${encodeURIComponent(q)}` |
| server.js | `https://jiosaavn-api-2.vercel.app/search/songs?query=${encodeURIComponent(q)}` |
| server.js | `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=15` |
| server.js | `https://google.com` |
| server.js | `http://localhost:${PORT}` |
| server.js | `http://${ip.address}:${PORT}` |
| server.js | `http://${primary.address}:${PORT}` |
| services/discover-host.ps1 | `http://$($json.hostIp):$($json.port)` |
| services/find_server.js | `http://${data.hostIp}:${data.port` |

## 18. تطابق نسخ Windows Agent

| ملف الجذر | النسخة المنشورة | التطابق البايتي |
|---|---|---|
| lab-agent.ps1 | public/agent/lab-agent.ps1 | متطابق |
| lab-agent.bat | public/agent/lab-agent.bat | متطابق |
| run-agent-hidden.vbs | public/agent/run-agent-hidden.vbs | متطابق |
| install-student-agent.bat | public/agent/install-student-agent.bat | متطابق |

## 19. ملحق النص الكامل للمشروع

لقطة مرجعية وليست ملفات بديلة للتشغيل. أُدرجت كل ملفات Markdown الخاصة بالمشروع أولًا ثم بقية المصادر. كلمة المرور مستبدلة بعلامة حجب. لم تُدرج الباينري وhtml2canvas.min.js وpackage-lock.json كنص خام؛ جردها وبصماتها والإصدارات موجودة أعلاه. تنسيق نهاية الأسطر قد يُطبَّع عند العرض، لذلك البصمة في الجرد تخص الملف الأصلي.


### المصدر: docs/DESIGN_SYSTEM.md

~~~~md
# نظام تصميم "نؤطة" (No2ta Design System) — v1.1 "Midnight & Brass"

> **ملف مرجعي رسمي.** هذا الملف هو **المصدر الوحيد والمُعتمَد** لكل قرار بصري في منصة "نؤطة". أي إنسان أو موديل AI (Claude أو غيره) هيشتغل على تصميم أو UI في هذا المشروع **لازم يقرأ هذا الملف الأول ويلتزم به حرفيًا**، بدل ما يخترع ألوان/مسافات/أحجام جديدة من دماغه. لو احتجت قيمة غير موجودة هنا (لون جديد، حجم جديد)، **الأول تضيفها هنا بتوثيق سبب وجودها**، وبعدين تستخدمها في الكود — ممنوع قيمة "يتيمة" تتكتب جوه كلاس Tailwind أو CSS مباشرة بدون ما تكون موجودة في هذا النظام.

**الحالة:** التطبيق جارٍ فعليًا على الكود (`public/index.html`, `public/css/style.css`, `public/js/app.js`, `public/css/design-tokens.css`) بشكل تدريجي.

**v1.1 — ليه اتغيّر عن v1.0؟** النسخة الأولى (Ink Blue + Teal) اتعرضت فعليًا على التطبيق الحقيقي والمستخدم رفضها — "الألوان الغامقة دي مش عاجباني" و"عايزين نشيل كل الإيموجيهات". اتعملت 3 اتجاهات بديلة بصرية حقيقية (بدون أي إيموجي، أيقونات Lucide فعلية) في `docs/design-direction-preview-v2.html`، واختار المستخدم الاتجاه الأول: **"ليلي وبراص" (Midnight & Brass)**. هذا الملف يوثّق الاتجاه المعتمد النهائي.

**الملفات المرتبطة بهذا النظام:**
- `docs/DESIGN_SYSTEM.md` ← هذا الملف (الشرح والقواعد والمنطق والـ"ليه").
- `public/css/design-tokens.css` ← التنفيذ الفعلي كـ CSS Variables، مربوط بالفعل في `index.html`.
- `docs/design-direction-preview-v2.html` ← المقارنة البصرية التفاعلية اللي بُني عليها القرار (3 اتجاهات، الاتجاه الأول هو المعتمد).

---

## 0. الهوية والفكرة (Creative Direction)

### 0.1 المشكلة اللي بنحلها بصريًا
الشكل الأصلي للمنصة بُني بمنطق "كل ميزة لوحدها" — كل مطوّر/جلسة شغل فيها اختار لون وحجم مستقل، فالنتيجة ألوان Neon عشوائية (cyan + purple + indigo + emerald + pink + amber + red) على خلفية قريبة من الأسود تمامًا، إيموجي في كل حتة، وكثافة بصرية عالية بدون تدرّج واضح للأهمية. ده شكل "هواية/تجربة شخصية" مش شكل "منتج شركة محترفة وفخمة".

### 0.2 الاتجاه المعتمد: "ليلي وبراص" (Midnight & Brass)
**هوية داكنة فخمة وواثقة** — دافئة مش باردة، معدنية مش Neon:
- خلفية **غرافيت/أسود دافئ شبه بُني** (`#0B0A09`) — أعمق وأدفأ من الأسود الفاحم العادي، وأبعد تمامًا عن برودة الـ"Ink Blue" اللي اترفضت في v1.0.
- **لون أساسي واحد (Primary) = ذهبي/براص (Brass Gold)** — معدني فخم، بديل كامل للـ cyan/teal القديم، وهو نفسه اللون اللي كان "ثانوي" في v1.0 بس دلوقتي بقى هو قائد الهوية الوحيد.
- **لون ثانوي (Secondary) = أخضر سيج مطفي (Muted Sage)** — تباين هادي جدًا مع الذهبي، مُستخدم بحرص شديد ولحالات محدودة فقط.
- الحدود كلها بقت **ذهبية خفيفة جدًا** (`rgba(214,178,110, ...)`) بدل الأبيض الشفاف العادي — ده اللي بيدي إحساس "المعدن الفاخر" بدل "زجاج عادي".
- **إلغاء كل الإيموجي من كل عنصر وظيفي في الواجهة.** كل زرار/أيقونة/عنوان قسم بيستخدم أيقونة SVG حقيقية من مكتبة **Lucide** (راجع §5). الإيموجي يفضل موجود **فقط** في المحتوى الشخصي اللي المستخدم نفسه بيختاره (افتار الطالب، تفاعلات الشات لو موجودة) — مش في أي زرار أو تسمية تصميم.

### 0.3 مبادئ ثابتة (Design Principles)
1. **لون واحد يقود القرار، مش ستة.** أي شاشة، أول ما تدخلها، عينك تعرف "فين الفعل الأساسي" (Primary Action) بسرعة لأنه اللون الذهبي بس.
2. **الألوان الدلالية (Success/Warning/Danger) مقدّسة.** الأحمر = خطر/حذف فقط. الأخضر = نجاح/متاح فقط. مفيش حد يستعير لون دلالي لحاجة تانية.
3. **التباين قبل الجمال.** أي نص أساسي لازم يحقق تباين WCAG AA (4.5:1) على الأقل مع خلفيته.
4. **لا نص أصغر من 12px** في أي محتوى يُقرأ بشكل منتظم (أوقات، تنبيهات، أسماء). 10.5px أصغر حجم مسموح، وفقط لبيانات ثانوية جدًا (timestamp صغير جانبي).
5. **مسافة واحدة تكرر نفسها، لا تُخترع.** كل "فراغ" في التصميم لازم يكون من سلّم `--space-*` المعتمد هنا.
6. **كل Modal نفس القالب.** هيدر + محتوى + فوتر اختياري، بنفس الحشو، بنفس زر الإغلاق، بنفس حجم العنوان.
7. **RTL أولاً، دايمًا.** لا تُكتب `left/right` مباشرة؛ استخدم خصائص منطقية (`margin-inline-start`, `text-align: start`...) إلا في حالات مقصودة (أرقام/IP/كود) موضّحة في §6.
8. **ولا إيموجي واحد كأيقونة وظيفية.** إغلاق، حذف، إرسال، إعدادات، تنبيه — كلهم أيقونة Lucide SVG. الإيموجي محصور في محتوى شخصي/مُختار من المستخدم فقط.

---

## 1. الألوان (Color Tokens)

كل الألوان مُعرَّفة كـ CSS Variables في `public/css/design-tokens.css`. **ممنوع استخدام قيمة hex مباشرة في أي مكان تاني غير هذا الملف.**

### 1.1 طبقات الخلفية (Surface / Background)

| Token | القيمة (Hex) | الاستخدام |
|---|---|---|
| `--no2ta-bg-canvas` | `#0B0A09` | خلفية الصفحة الأساسية (أغمق طبقة) |
| `--no2ta-bg-surface` | `#161310` | البطاقات، الشريط الجانبي، الهيدر |
| `--no2ta-bg-surface-raised` | `#1F1A15` | المودالز، العناصر "العائمة" فوق المحتوى |
| `--no2ta-bg-surface-sunken` | `#060504` | مناطق الإدخال الغائرة (Textarea الكود، السبورة) |
| `--no2ta-bg-overlay-scrim` | `rgba(5, 4, 3, 0.78)` | الطبقة السوداء الشفافة خلف أي Modal |

> **ليه مش أسود خالص؟** الأسود الخالص (`#000`) جامد وبارد. الـ `#0B0A09` فيه ميل دافئ جدًا للبني الغامق بيدي إحساس "غرافيت/جلد فاخر" بدل "عتمة فاضية"، وهو أساس إحساس "الفخامة" في الهوية الجديدة.

### 1.2 الحدود (Borders)

حدود ذهبية خفيفة بدل الأبيض الشفاف العادي — ده اللي بيدي إحساس "معدني" للواجهة.

| Token | القيمة | الاستخدام |
|---|---|---|
| `--no2ta-border-subtle` | `rgba(214,178,110,0.08)` | حدود خفيفة جدًا بين أقسام نفس البطاقة |
| `--no2ta-border-default` | `rgba(214,178,110,0.16)` | حدود البطاقات/المودالز الأساسية |
| `--no2ta-border-strong` | `rgba(214,178,110,0.32)` | حدود عناصر تفاعلية عند hover/focus |
| `--no2ta-border-accent` | `rgba(214,178,110,0.5)` | حدود عنصر مُفعَّل مرتبط باللون الأساسي |

### 1.3 النصوص (Text)

| Token | القيمة | الاستخدام |
|---|---|---|
| `--no2ta-text-primary` | `#F5EFE4` | العناوين، النص الأساسي |
| `--no2ta-text-secondary` | `#B8AC97` | النص الثانوي، الوصف تحت العنوان |
| `--no2ta-text-tertiary` | `#7C7363` | Placeholder، Timestamps، نص غير مهم |
| `--no2ta-text-disabled` | `rgba(124,115,99,0.5)` | نص عنصر معطّل |
| `--no2ta-text-on-accent` | `#1A1308` | نص فوق خلفية بلون Primary (داكن لضمان تباين) |

### 1.4 اللون الأساسي (Primary — Brass Gold)

اللون الوحيد اللي يمثّل "الفعل والهوية" في المنصة كلها — معدني، دافئ، فخم.

| Token | القيمة | الاستخدام |
|---|---|---|
| `--no2ta-primary-50` | `#FBF3E3` | نص فوق خلفية primary غامقة جدًا (نادر) |
| `--no2ta-primary-300` | `#E8C988` | Hover على نص/أيقونة primary |
| `--no2ta-primary-500` | `#D6B26E` | **اللون الأساسي للمنصة** — أزرار أساسية، روابط، Focus ring |
| `--no2ta-primary-600` | `#C49A4E` | حالة Hover لزر Primary |
| `--no2ta-primary-700` | `#A67E39` | حالة Active/Pressed |
| `--no2ta-primary-surface` | `rgba(214,178,110,0.12)` | خلفية خفيفة لأي شيء "مُفعَّل" بالـ primary (badge, selected tab) |

### 1.5 اللون الثانوي (Secondary — Muted Sage)

تباين هادي جدًا مع الذهبي — يُستخدم بحرص شديد وبكمية محدودة (مش محجوز لحالة واحدة زي v1.0، لكن استخدامه المتكرر لازم يفضل نادر).

| Token | القيمة | الاستخدام |
|---|---|---|
| `--no2ta-secondary-300` | `#AAB8A0` | نص/أيقونة خفيفة |
| `--no2ta-secondary-500` | `#8A9A8C` | **اللون الثانوي** — لمسات هادية محدودة |
| `--no2ta-secondary-600` | `#71806F` | Hover |
| `--no2ta-secondary-surface` | `rgba(138,154,140,0.14)` | خلفية خفيفة |

### 1.6 الألوان الدلالية (Semantic — لها معنى ثابت دايمًا)

| الحالة | Token | القيمة | المعنى الوحيد المسموح |
|---|---|---|---|
| نجاح/متاح | `--no2ta-success-500` | `#7FAE63` | تم الحفظ، متصل، نجاح العملية |
| تحذير | `--no2ta-warning-500` | `#E08A3C` | وضع التركيز مفعّل، تنبيه غير حرج |
| خطر/حذف | `--no2ta-danger-500` | `#E0604A` | حذف، طرد، زر البشمهندسة، خطأ |
| معلومة | `--no2ta-info-500` | `#6FA8C9` | بانر معلوماتي عادي (مش تحذير ومش نجاح) |

كل حالة ليها نسخة `-surface` (شفافية 14%) لاستخدامها كخلفية Badge/Banner بدل اللون الصلب. ملاحظة: الدلالية كلها اتخفّت شوية عن الألوان الـ"Flat" التقليدية عشان تنسجم مع الخلفية الدافئة، لكن فضلت متمايزة تمامًا عن الذهبي الأساسي وعن بعضها.

### 1.7 ألوان تصنيف الأدوات (Feature Tags)

مجموعة ثابتة من 6 ألوان مطفية تنسجم مع الهوية الدافئة. تُستخدم **فقط** كـ "وسم تصنيف" صغير (نقطة لون، حد خفيف) على أدوات الهيدر — لا تُستخدم كخلفية كاملة لزر كبير.

| التصنيف | Token | القيمة | الأدوات |
|---|---|---|---|
| تواصل | `--no2ta-tag-comms` | `#D6B26E` (= Primary) | AirDrop، الشات، الإذاعة العامة |
| تعاون | `--no2ta-tag-collab` | `#7C8FBD` | السبورة، كشكول الأكواد |
| ميديا | `--no2ta-tag-media` | `#C98BA0` | الاستوري، الموسيقى |
| روحانيات | `--no2ta-tag-faith` | `#B5693F` | الصلاة، التسبيح، إذاعة القرآن |
| بث | `--no2ta-tag-broadcast` | `#6E8CA6` | بث الشاشة |
| إدارة | `--no2ta-tag-admin` | `#CC7A3D` | أدوات الأدمن غير الهدّامة (مراقبة، قفل) — **غير** الحذف/الطرد اللي يستخدم `danger` |

> **قاعدة صارمة:** زر أو مودال لا يُلوَّن بالكامل بلون الـ Tag. الـ Tag بيبان في: نقطة صغيرة 6px، حدّ رفيع 1px، أو badge صغير نصّه بهذا اللون. الخلفية الأساسية لأي مكوّن تيجي من §1.1 دايمًا.

---

## 2. الطباعة (Typography)

### 2.1 عائلات الخطوط

| الدور | الخط | المصدر | ملاحظة |
|---|---|---|---|
| العربي (أساسي) | **Cairo** (400/600/700/800) | Google Fonts (مُحمَّل بالفعل) | خط عربي هندسي حديث، مناسب تمامًا — **لا تغيير**، فقط انضباط في الأوزان المستخدمة |
| اللاتيني الثانوي | **Plus Jakarta Sans** | Google Fonts (مُحمَّل بالفعل) | لكلمات إنجليزية مفردة وسط نص عربي |
| Mono (أرقام/كود) | **JetBrains Mono** | Google Fonts | **تغيير مطلوب**: يُستخدم الآن فقط في `stealth/physics.html`؛ يجب تعميمه على كل الأرقام/العدّادات/IP/الكود بدل `font-mono` الافتراضي من Tailwind |

### 2.2 السلّم النوعي (Type Scale)

| Token | الحجم | الوزن | الاستخدام |
|---|---|---|---|
| `--no2ta-text-display` | 28px / 1.75rem | 800 | عنوان شاشة تسجيل الدخول فقط |
| `--no2ta-text-h1` | 20px / 1.25rem | 800 | عناوين المودالز الكبيرة |
| `--no2ta-text-h2` | 16px / 1rem | 700 | عناوين الأقسام داخل المودال |
| `--no2ta-text-body-lg` | 15px | 600 | نص مهم (اسم المستخدم، عنوان الرسالة) |
| `--no2ta-text-body` | 13px | 500/400 | النص العادي الافتراضي |
| `--no2ta-text-caption` | 12px | 500 | نصوص ثانوية (وصف، hint) |
| `--no2ta-text-micro` | 10.5px | 600 | **الحد الأدنى المطلق** — timestamps فقط، ممنوع لمعلومة أساسية |

**ممنوع تمامًا** استخدام `text-[9px]` أو أي قيمة أقل من `10.5px` في أي مكان. أي حجم حالي أصغر من ذلك (موجود في أوقات الصلاة، العدّادات، badges) يُرفَّع لـ `--no2ta-text-micro` كحد أدنى.

---

## 3. المسافات والقياسات (Spacing, Radius, Elevation)

### 3.1 سلّم المسافات (Spacing)
نعتمد سلّم Tailwind الافتراضي (قاعدة 4px) **كما هو** بدون قيم عشوائية جديدة، لكن بقواعد استخدام ثابتة حسب الدور:

| الدور | القيمة المعتمدة |
|---|---|
| حشو زر عادي | `px-4 py-2.5` |
| حشو زر صغير (icon-only) | `p-2` |
| حشو بطاقة | `p-4` |
| حشو Modal (body) | `p-6` |
| المسافة بين عناصر صف أدوات | `gap-2` |
| المسافة بين أقسام داخل Modal | `space-y-4` |

### 3.2 الانحناءات (Border Radius)

| Token | القيمة | الاستخدام |
|---|---|---|
| `--no2ta-radius-xs` | 8px | Badges, Chips |
| `--no2ta-radius-sm` | 10px | Inputs, أزرار صغيرة |
| `--no2ta-radius-md` | 14px | أزرار عادية، بطاقات صغيرة |
| `--no2ta-radius-lg` | 20px | بطاقات كبيرة، شريط جانبي |
| `--no2ta-radius-xl` | 28px | **كل المودالز بدون استثناء** (بدل الخليط الحالي sm→6xl) |
| `--no2ta-radius-full` | 9999px | أفاتار، أزرار دائرية (الإغلاق ✕) |

### 3.3 الارتفاع البصري (Elevation / Shadows)

4 مستويات فقط، مُصمَّمة للخلفية الغامقة الجديدة (ظل حقيقي، مش glow نيون متكرر):

| Token | القيمة | الاستخدام |
|---|---|---|
| `--no2ta-shadow-1` | `0 1px 2px rgba(0,0,0,0.3)` | بطاقات مسطحة بسيطة |
| `--no2ta-shadow-2` | `0 4px 12px rgba(0,0,0,0.35)` | بطاقات تفاعلية، قوائم عائمة |
| `--no2ta-shadow-3` | `0 12px 32px rgba(0,0,0,0.45)` | المودالز |
| `--no2ta-shadow-glow-accent` | `0 0 0 1px var(--no2ta-border-accent), 0 4px 20px rgba(45,212,191,0.25)` | **محجوز فقط** لعنصر "live/نشط الآن" واحد في كل شاشة (مش لكل زر) |

---

## 4. الحركة (Motion)

| Token | القيمة |
|---|---|
| `--no2ta-duration-fast` | 120ms |
| `--no2ta-duration-base` | 200ms |
| `--no2ta-duration-slow` | 320ms |
| `--no2ta-ease-standard` | `cubic-bezier(.4,0,.2,1)` |

**قاعدة استخدام `animate-pulse` / `animate-ping`:** محجوزة **حصريًا** لمؤشرات "حدث الآن فعليًا" (نقطة اتصال مباشر، تسجيل صوتي شغّال، بث حي شغّال). ممنوع استخدامها لتزيين زر عادي أو badge ثابت — الاستخدام الحالي فيه إفراط (كل زرار تقريبًا بتاعه `animate-pulse`) وده بيلغي معنى "تنبيه حقيقي".

---

## 5. نظام الأيقونات (Icon System)

### 5.1 القرار
**إلغاء الإيموجي بالكامل من كل عنصر وظيفي** (v1.1: قرار أشد من v1.0 بعد رفض المستخدم للإيموجي تمامًا). مكتبة الأيقونات المعتمدة: **[Lucide Icons](https://lucide.dev)** — مجانية، خط رفيع متّسق (stroke-based)، تحميل مباشر عبر CDN بدون أي build step (`<script src="https://unpkg.com/lucide@latest"></script>` ثم `lucide.createIcons()`)، وتدعم RTL بسهولة لأنها SVG خام.

**طريقة الاستخدام في الكود:** `<i data-lucide="send"></i>` داخل أي زرار/عنصر، ولازم نداء `lucide.createIcons()` بعد أي تحديث DOM ديناميكي (رسائل، قوائم، مودالز مفتوحة حديثًا) عشان الأيقونات الجديدة تترسم.

### 5.2 قاعدة الاستخدام
| النوع | القرار |
|---|---|
| أيقونات وظيفية (إرسال، حذف، تعديل، إغلاق، إعدادات، بحث، رفع ملف، قفل، تنبيه، كل أزرار الهيدر والمودالز) | **أيقونة Lucide SVG دايمًا — ولا إيموجي واحد** |
| محتوى شخصي يختاره المستخدم بنفسه (أفاتار الطالب من قائمة إيموجي) | إيموجي مسموح (نظام موجود وناجح، ده اختيار المستخدم لنفسه مش تصميم الواجهة، لا تغيير) |
| نص رسائل الشات الحر اللي بيكتبه المستخدم | لا رقابة — ده محتوى المستخدم مش عنصر واجهة |

**قاعدة صارمة:** أي إيموجي ظاهر في عنوان قسم، زرار، badge، أو عنوان مودال (حتى لو كان "بسيط" زي ⚡ في اللوجو) يتحول لأيقونة Lucide. الحد الأقصى: أيقونة Lucide واحدة + نص، بدون إيموجي مرافق أبدًا.

### 5.3 خريطة الأيقونات الأساسية (Icon Mapping)
| الميزة | اسم أيقونة Lucide |
|---|---|
| AirDrop | `send` |
| السبورة | `pen-tool` |
| كشكول الأكواد | `code-2` |
| بث الشاشة | `monitor-play` |
| إذاعة القرآن | `radio` |
| أغاني الفصل | `music-2` |
| السبحة الإلكترونية | `circle-dot-dashed` |
| توقيت الإسكندرية/الصلاة | `clock` |
| الأدمن | `crown` |
| زر البشمهندسة | `siren` |
| إغلاق (كل المودالز) | `x` |
| تأكيد/حفظ | `check` |
| حذف | `trash-2` |
| إعدادات | `settings` |
| رجوع | `arrow-right` (يُعكس تلقائيًا بـ CSS تحت `[dir="rtl"]`) |
| زملاء/أونلاين | `users` |
| ملف | `file-text` |
| صورة | `image` |

---

## 6. اتجاه الكتابة (RTL / LTR Rules)

المنصة RTL بالكامل (`dir="rtl"` على `<html>`) وهذا **لا يتغيّر**. القواعد:

1. **استخدم خصائص منطقية دايمًا:** `margin-inline-start/end` بدل `margin-left/right`، `text-align: start/end` بدل `left/right`، `border-inline-start` بدل `border-left`. في Tailwind: استخدم `ms-*`/`me-*`/`ps-*`/`pe-*` (الإصدارات المنطقية) بدل `ml-*`/`mr-*`/`pl-*`/`pr-*` في أي كود جديد.
2. **محتوى LTR داخل سياق RTL** (أرقام IP، عناوين MAC، كود برمجي، أرقام إنجليزية في عدّاد): يُلفّ دايمًا بـ `<span dir="ltr" class="font-mono">...</span>` — زي ما بعض الحقول بتعمل حاليًا، لكن بشكل متّسق في كل مكان مش بعض الأماكن بس.
3. **الأيقونات اللي فيها اتجاه** (سهم "التالي"، سهم "رجوع") تُعكس تلقائيًا مع RTL — لازم تُختار من مكتبة الأيقونات نسخة "اتجاه منطقي" (Phosphor بتدعم ده عبر `transform: scaleX(-1)` المشروط بـ `[dir="rtl"]`).
4. **ممنوع** مزج `padding-left` مع `border-right` على نفس العنصر (مشكلة موجودة حاليًا في بطاقة توقيت الإسكندرية بالهيدر) — استخدم `ps-*`/`border-inline-end` بدل الخلط.

---

## 7. المكوّنات (Component Specs)

> كل مكوّن هنا بديل **موحّد** لكل النُسخ المتفرقة الحالية من نفس الفكرة (مثلاً: المودالز الـ 20+ كلهم هيستخدموا نفس القالب في §7.2).

### 7.1 الأزرار (Buttons)

| Variant | الاستخدام | الخلفية | النص |
|---|---|---|---|
| `Primary` | فعل أساسي واحد في الشاشة (إرسال، حفظ، تأكيد) | `--no2ta-primary-500`، hover `-600` | `--no2ta-text-on-accent` |
| `Secondary` | فعل ثانوي (إلغاء، رجوع) | `--no2ta-bg-surface-raised` + حدّ `--no2ta-border-default` | `--no2ta-text-primary` |
| `Ghost` | فعل خفيف جدًا داخل شريط أدوات | شفاف، hover خلفية `--no2ta-border-subtle` | `--no2ta-text-secondary` |
| `Danger` | حذف/طرد/تدمير | `--no2ta-danger-500` | أبيض |
| `Icon Button` | أيقونة فقط (إغلاق، إعدادات) | دائري `--no2ta-radius-full`، 36×36px دايمًا | — |

أحجام: `sm` (32px ارتفاع) / `md` (40px — الافتراضي) / `lg` (48px، لزر "دخول المنصة" فقط).

### 7.2 المودالز (Modal) — القالب الموحّد لكل الـ 20+ مودال

```
┌──────────────────────────────────────────┐
│ [أيقونة+عنوان h1]              [زر ✕ دائري] │  ← هيدر: p-6 pb-4, حدّ سفلي subtle
├──────────────────────────────────────────┤
│                                          │
│              المحتوى (body)              │  ← p-6, سكرول لو طويل
│                                          │
├──────────────────────────────────────────┤
│                     [ثانوي] [أساسي Primary] │  ← فوتر اختياري: p-6 pt-4
└──────────────────────────────────────────┘
```
- خلفية: `--no2ta-bg-surface-raised`، radius: `--no2ta-radius-xl` (28px) **دايمًا**، ظل: `--no2ta-shadow-3`.
- 4 أحجام فقط مسموحة: `sm` (max-w-sm، تأكيدات)، `md` (max-w-md، فورم قصير)، `lg` (max-w-2xl، محتوى متوسط)، `full` (max-w-5xl+، NetSupport/الأدمن). **ممنوع** أي `max-w-*` خارج هذه الأربعة.
- زر الإغلاق: دايمًا نفس المكوّن (دائرة 32px، أيقونة ✕ SVG)، في الزاوية البادئة منطقيًا (`inset-inline-start` أعلى RTL) — **اتساق واحد بدل التنقل الحالي بين `top-4 left-4` و زرار داخل صف الهيدر**.
- دالة فتح/إغلاق واحدة فقط: `openModal(id)` / `closeModal(id)` — **إلغاء الاستخدام المزدوج الحالي** (`showModal/hideModal` و `closeModal` في نفس الوقت لمودالات مختلفة).

### 7.3 الحقول (Inputs / Textarea / Select)
- خلفية `--no2ta-bg-surface-sunken`, حدّ `--no2ta-border-default`, radius `--no2ta-radius-sm`.
- Focus: حدّ `--no2ta-primary-500` + `box-shadow: 0 0 0 3px var(--no2ta-primary-surface)` (ring متّسق بدل اختلاف Tailwind `ring-1`/`ring-2` الحالي).
- ارتفاع ثابت `40px` لكل input عادي (مش متغيّر بين المودالز كما حاليًا).

### 7.4 البادچ (Badge / Pill)
- `Status Badge` (متصل/غير متصل، مقفول/مفتوح): يستخدم لون دلالي من §1.6 فقط.
- `Tag Badge` (تصنيف أداة): نقطة لون 6px + نص، يستخدم ألوان §1.7 فقط.
- خلفية دايمًا نسخة `-surface` (شفافية)، مش اللون الصلب الكامل.

### 7.5 الهيدر العلوي (إعادة تنظيم مطلوبة)
تقسيم منطقي لـ 3 مجموعات بدل صف واحد طويل:
1. **أدوات الفصل** (يسار RTL البداية): أيقونات فقط (بدون نص) لـ AirDrop/السبورة/الكشكول/بث الشاشة، + قائمة "المزيد ⋯" تجمع الباقي (موسيقى/تسبيح) على الشاشات الصغيرة.
2. **الوسط**: Pill وقت الإسكندرية (يبقى، لكن بدون خلط padding/border RTL كما في §6.4).
3. **حسابي + الأدمن** (يمين RTL البداية): بروفايل، زر الأدمن (لو موجود)، وزر البشمهندسة الأحمر **بمفرده دايمًا آخر عنصر** لأنه الأهم أمنيًا.

### 7.6 البطاقة (Card/Panel)
خلفية `--no2ta-bg-surface`، حدّ `--no2ta-border-subtle`، radius `--no2ta-radius-lg`، حشو `p-4`. **بدون** `backdrop-blur` في كل مكان — الـ Blur محجوز فقط للعناصر العائمة فوق المحتوى (Modal, Dropdown) لأسباب أداء ووضوح.

---

## 8. المحتوى والنغمة (Voice & Emoji Policy)

- النغمة المصرية الخفيفة في النصوص **تُحتفَظ بها بالكامل** — ده جزء من هوية المنصة ومُحبَّب من الطلاب، التعديل بصري بس.
- **قاعدة الإيموجي الجديدة:** إيموجي واحد كحد أقصى لكل عنصر واجهة (زر/badge/عنوان)، ومحجوز للمحتوى الثقافي/الشخصي فقط (§5.2). ممنوع تكرار إيموجي 2-3 مرات في نفس الزرار (مثال حالي للإصلاح: `📻 holyquranradio.com ↗` + نقطة متحركة + إيموجي تاني بجانبه).
- رسائل الخطأ: واضحة ومباشرة، من غير اعتذار زايد، وتوضّح الحل (مثال: رسالة الباسورد الخطأ الحالية تتحول لصيغة أهدى: "كلمة السر غير صحيحة، جرّب تاني" بدل كتابة الباسورد الصحيح كامل في رسالة الخطأ).

---

## 9. خريطة التنفيذ (Implementation Bridge)

عشان أي حد (أو موديل) يربط هذا النظام بالكود الفعلي لاحقًا:

1. **Tailwind Config** (داخل `<script>tailwind.config = {...}</script>` في `index.html`): كل الألوان في §1 تُضاف تحت `theme.extend.colors.no2ta` (مثلاً `no2ta.primary.500`)، بدل استخدام ألوان Tailwind الجاهزة (`cyan-500`, `purple-500`...) مباشرة.
2. **CSS Variables**: `public/css/design-tokens.css` (مرفق مع هذا النظام) يحتوي كل القيم كـ `:root { --no2ta-*: ... }` — يُضاف كـ `<link>` في `index.html` **قبل** `style.css`.
3. **لا Big-Bang Rewrite**: التطبيق يبدأ بمكوّن واحد في كل مرة (نبدأ بالمودالز لأنها الأكثر تكرارًا، 20+ نسخة من نفس الفكرة)، مش تغيير كل الصفحة دفعة واحدة.
4. **خطوة لاحقة (غير مطلوبة الآن):** الانتقال من Tailwind CDN لـ build حقيقي (راجع §10.1 في `docs/NO2TA_APP_STUDY.md`) — هتسهّل تفعيل هذا النظام بشكل أنظف، لكن النظام هنا مكتوب بحيث يشتغل مع الـ CDN الحالي كمان بدون الانتظار لهذا القرار.

---

## 10. الحوكمة (Governance)

- **ممنوع** إضافة لون/حجم/ظل جديد في الكود مباشرة بدون إضافته هنا الأول مع سبب استخدامه.
- أي طلب "لون جديد لميزة جديدة" → يُصنَّف أولًا: هل هو Semantic (§1.6)، Feature Tag (§1.7)، ولا حالة استثنائية حقيقية تحتاج توسيع النظام؟
- نسخة هذا الملف: **v1.1 "Midnight & Brass"** — أي تعديل جوهري (إضافة لون أساسي جديد، تغيير الخط) يرفع النسخة ويُسجَّل سبب التغيير في أعلى الملف.
  - v1.0 → v1.1: استبدال Ink Blue + Teal بـ Midnight & Brass، وإلغاء الإيموجي الوظيفي بالكامل لصالح Lucide Icons، بعد مراجعة المستخدم الفعلية للتطبيق المُنفَّذ ورفضه الاتجاه الأول.

~~~~


### المصدر: docs/NO2TA_APP_STUDY.md

~~~~md
# دراسة شاملة لمنصة "نؤطة" (No2ta) — قبل إعادة تصميم الواجهة

> هذا الملف تحليل كامل للكود الحالي (Backend + Frontend) زي ما هو دلوقتي، بهدف توثيق كل الصفحات والمكونات والميزات قبل ما نبدأ في إعادة تصميم الـ UI بشكل "فخم" واحترافي. في آخر الملف قسم مخصص للمشاكل والملاحظات على الشكل الحالي.

---

## 1. فكرة المنصة ببساطة

"نؤطة" مش تطبيق سوشيال ميديا عادي — هو **سيرفر Node.js واحد يشتغل على جهاز "الأدمن" (المعلّم/صاحب الجهاز) ويوصل كل أجهزة الفصل على نفس شبكة الـ Wi-Fi المحلية (LAN)**، وكل طالب بيدخل من المتصفح (موبايل أو لابتوب) على نفس الرابط. مفيش إنترنت مطلوب غير لبعض الميزات الاختيارية (البحث عن أغاني أونلاين، راديو القرآن، TTS).

المنصة بتجمع:
- **واتساب**: شات عام + شات خاص (1-to-1) + جروبات + صوت + ملفات + رسائل تختفي.
- **إنستجرام**: ستوريهات بالصور/الفيديو/النص + حلقة التوهج + عداد المشاهدات.
- **Discord-ish**: سبورة مشتركة حية، كشكول أكواد حي، مشاركة الشاشة (WebRTC)، راديو/موسيقى متزامنة لكل الفصل.
- **نظام إداري قوي جداً للمعلّم (Admin)**: مراقبة شاشات الطلاب لحظيًا (شبيه ببرنامج NetSupport School)، قفل شاشة أي جهاز، إرسال تنبيهات، "زر البشمهندسة" (تمويه فوري لكل الأجهزة بصفحة امتحان Flutter/فيزياء مزيفة)، تجميد الويك إند لعداد التواصل، أذان وتسبيح جماعي... إلخ.

**هوية الأدمن** مش باسم مستخدم/باسورد عادي — هي **عنوان MAC الفيزيائي لكارت الشبكة** (`D0:8E:79:18:9F:A0`, ثابت في الكود). أي جهاز بهذا الـ MAC بيتحول أوتوماتيك لأدمن كامل الصلاحيات، وكل الأجهزة التانية "طالب" بشكل افتراضي.

---

## 2. الـ Stack التقني

| الطبقة | التقنية |
|---|---|
| Backend | Node.js + **Express 5** + **Socket.IO 4** (realtime) |
| قاعدة البيانات | **SQLite** (ملف `data/no2ta.db`، عبر `sqlite3`) |
| رفع الملفات | **Multer** (حدّ 100MB للملف، 50MB لحجم الـ socket buffer) |
| الواجهة | HTML عادي + **Tailwind CDN** (`cdn.tailwindcss.com` — مش production build) + CSS مخصص (`style.css`) + **JS خام (Vanilla)** بدون أي framework (لا React ولا Vue) — ملف واحد ضخم `app.js` (~6300 سطر) |
| الصوت | Web Audio API مخصص (`audio_synth.js`) لتصنيع صوت توليدي + ملفات `.mp3/.wav` مسجّلة بصوت بشري حقيقي للأذكار |
| تصوير الشاشة | `html2canvas` لتصوير صفحة الطالب نفسها + PowerShell agent لتصوير سطح مكتب ويندوز الحقيقي |
| QR | مكتبة `qrcode` لإنشاء QR لدخول الطلاب |
| التشفير | `crypto-js` (فك تشفير روابط أغاني Saavn المشفّرة بـ DES) |

**ملاحظة مهمة**: لا يوجد أي build step (لا Webpack ولا Vite) — كل شيء Static files تحت `public/` تتقدَّم مباشرة بـ `express.static`.

---

## 3. خريطة الملفات

```
server.js                 ← نقطة الدخول: كل REST APIs + Socket.IO handlers (2763 سطر)
data/
  db.js                   ← تعريف جداول SQLite + Promise wrappers (run/get/all)
  tasbeeh.json            ← عدّاد التسبيح الجماعي (يُحفظ كملف JSON مستقل عن الـ DB)
services/
  network.js              ← استنتاج IP/MAC الجهاز (عبر أمر `arp -a` في ويندوز)
  streaks.js              ← منطق حساب الـ Streaks بين كل زوج طلاب + تجميد الويك إند
  discovery.js            ← بث UDP Broadcast (no2ta beacon) لمساعدة الطلاب بإيجاد IP السيرفر
  find_server.js          ← سكريبت عميل يستمع للبث السابق (يُستخدم من lab-agent وغيره)
public/
  index.html              ← الصفحة الوحيدة لكل التطبيق (SPA كامل بـ 1878 سطر HTML)
  css/style.css           ← تنسيقات خاصة فوق Tailwind (Glassmorphism, حركات...)
  js/app.js               ← كل منطق الواجهة (6282 سطر) — لا فصل لملفات/مكونات
  js/audio_synth.js       ← محرك صوت توليدي (نغمات / بيب) بديل للملفات الصوتية
  js/html2canvas.min.js   ← مكتبة تصوير DOM (لقطة شاشة المتصفح)
  stealth/physics.html    ← صفحة تمويه "كويز فيزياء" (1025 سطر، كويز تفاعلي كامل فعليًا)
  stealth/flutter.html    ← صفحة تمويه "كويز Flutter" (نفس الفكرة، مادة تانية)
  agent/*                 ← نُسخ من سكريبتات العميل (يتم تحميلها من المتصفح كـ"تثبيت عميل الويندوز")
  audio/*                 ← ملفات صوتية (أذكار، تسبيح، سلاوات...) — فيها نسخ "بشرية" و"مصنّعة"
uploads/                  ← ملفات مرفوعة من الطلاب (media, audio, stories, airdrop, avatars, music)
lab-agent.ps1             ← PowerShell agent: يأخذ لقطة Full Desktop فعلية ويرسلها كل 1.5 ثانية
install-student-agent.bat ← يثبّت lab-agent.ps1 في Startup الويندوز ويشغّله مخفي (VBS silent)
Start_No2ta.bat           ← يفحص MAC الجهاز: لو أدمن يشغّل السيرفر، لو طالب يفتح المتصفح على IP الأدمن مباشرة
Fix_Firewall.bat          ← يفتح المنفذ 5000 في فايروول ويندوز
```

---

## 4. الدخول والصلاحيات (Auth)

- **لا يوجد تسجيل حساب حقيقي**: شاشة الدخول (`authModal`) فيها حقل واحد فقط — **كلمة سر الفصل الموحّدة** `[REDACTED_SHARED_PASSWORD]` (مكتوبة Hardcoded في `server.js` وحتى معروضة كـ placeholder/value افتراضي في الـ HTML!) + اسم شهرة + أفاتار (رفع صورة أو اختيار إيموجي من 6 خيارات ثابتة).
- بعد إدخال كلمة السر، السيرفر يحدد هوية الجهاز بـ:
  1. `device_id` يُحفظ في `localStorage` (دخول تلقائي بعد أول مرة).
  2. أو `mac_` + عنوان الـ MAC المكتشف عبر `arp -a`.
  3. أو `ip_` + عنوان الـ IP كـ fallback أخير.
- **الأدمن** = أي جهاز بعنوان MAC مطابق تمامًا لـ `D0:8E:79:18:9F:A0`، أو أي طلب من `127.0.0.1/::1` قادم من الجهاز الذي يملك فعليًا هذا الـ MAC على إحدى كروت شبكته.
- كل الطلاب الآخرين دورهم `student` بشكل تلقائي — لا توجد واجهة لترقية مستخدم لأدمن من داخل التطبيق (فقط تغيير الكارت/الجهاز).

---

## 5. خريطة الصفحة الرئيسية (كل القطاعات والمودالز)

الصفحة كلها `public/index.html` واحدة (SPA)، كل الأقسام والمودالز موجودة دايمًا في الـ DOM ومخفية بـ class `hidden`، وبيتم إظهارها عبر `showModal()/hideModal()` في JS.

### 5.1 الهيدر العلوي (Header) — صف واحد مزدحم جدًا
يحتوي على (من اليمين للشمال حسب RTL):
- زر **AirDrop** ⚡
- زر **السبورة** 🎨
- زر **كشكول الأكواد** 💻
- زر **بث الشاشة** 🖥️ (مع نقطة حمراء Live)
- زر **إذاعة القرآن** 📻 (بث لكل الأجهزة)
- زر **أغاني الفصل** 🎵
- زر **السبحة** 📿
- Badge "الويك إند مجمّد" ❄️🔥 (يظهر فقط جمعة/سبت)
- بعدها: Pill توقيت الإسكندرية + الحصة + البريك، زر **مراقبة المعمل** 🖥️ (أدمن فقط)، زر **الأدمن** 👑 (أدمن فقط)، بادچ البروفايل (الأفاتار + الاسم + الدور)، وأخيرًا **زر البشمهندسة 🚨** الأحمر النابض (دايمًا ظاهر، يعمل F2).

كل الأزرار دي في صف واحد `overflow-x-auto` — يعني على شاشة صغيرة هتتكوم فوق بعض وتتطلب سكرول جانبي.

### 5.2 بانر "أنت فاتح localhost" (مخفي عادة)
يظهر لو الطالب فتح `localhost` بالغلط بدل IP السيرفر، وبيوجهه لمودال الاتصال بالسيرفر.

### 5.3 شريط الاستوريهات (Stories Ribbon)
شريط أفقي أسفل الهيدر مباشرة فيه أفاتارات كل طالب نشر استوري (حلقة متوهجة لو غير مُشاهَد).

### 5.4 الجسم الرئيسي (Main Grid)
Grid بعمودين:
- **Sidebar (يسار/4 أعمدة)**: تابات (الفصل العام / الجروبات / الزملاء) + ويدجت مواقيت الصلاة والحصص (تقويم مدرسي كامل: البريك 11:10، البايونيك 3:30، المرواح 4:00) + قائمة الزملاء/الجروبات مع الـ Streaks.
- **نافذة الشات (يمين/8 أعمدة)**: هيدر الشات (اسم المحادثة + استريك + أزرار الجروب) + بانر بث الشاشة (لو فعّال) + بانر "وضع التركيز" (لو الأدمن قفل الشات) + تدفق الرسائل + مؤشر الكتابة + شريط تسجيل صوتي + فورم الإدخال (مرفقات، كود، نص، تسجيل صوتي، إرسال).

### 5.5 ⚠️ أوفرلاي التمويه الكامل (`stealthPhysicsOverlay`)
شاشة كاملة (fixed inset-0, z-50) تظهر فورًا لما يتفعل "البشمهندسة": هيدر مزيّف "المركز القومي للمناهج والتقويم التربوي" + iframe لصفحة `stealth/physics.html` (كويز حقيقي وشغال فعليًا — مش ديكور). فيه زرين: F3 (إغلاق على جهازي فقط، بباسورد) و"فك للجميع" (أدمن فقط).

### 5.6 المودالز (بالترقيم كما في الكود، 20+ مودال)
1. **تسجيل الدخول** (Auth)
2. **QR / معرفة IP السيرفر** (Network Modal)
3. **AirDrop** — رفع/تحميل ملفات بين الفصل
4. **السبورة التفاعلية** — Canvas حي، 5 ألوان + ممحاة + تصدير PNG
4b. **كشكول الأكواد المشترك** (Live CodePad) — Textarea واحدة متزامنة لكل الفصل + زر نسخ/إرسال للشات
4c. **مشاركة كود للشات** (Code Snippet) — عنوان + لغة + كود، يُرسل كرسالة منسّقة
5. **إنشاء استوري** — نص/تدرّج لوني أو صورة/فيديو
6. **عارض الاستوري** (تنقل تالي/سابق + مشاهدات + حذف)
6b. **قائمة مشاهدي الاستوري**
7. **لوحة تحكم الأدمن** — إذاعة عامة، وضع التركيز، فك التمويه للكل، إذاعة القرآن، + جدول كل الأجهزة المتصلة (IP/MAC/الدور/إجراء)
8. **مودال الإذاعة العامة** (يستقبلها الطلاب)
10. **تعديل البروفايل**
11. **الاتصال بسيرفر آخر** (إدخال IP يدويًا)
- **شريط الموسيقى العائم** (Classroom Music Bar) ثابت أسفل الشاشة
- **بانر فتح الصوت** (Autoplay Unlock) — لأن المتصفحات تمنع التشغيل التلقائي
- **مودال راديو القرآن** (holyquranradio.com) مع iframe مباشر + بث للفصل
- **مودال البحث عن موسيقى** (أونلاين + مكتبة محلية، تابين)
- **إنشاء جروب** + **أعضاء الجروب** + **طلبات الانضمام للجروب**
- **أوفرلاي قفل شاشة الطالب** (NetSupport lock)
- **مودال تنبيه مباشر من الأستاذ** (NetSupport popup)
- **مودال NetSupport الرئيسي** — Grid بطاقات لكل جهاز طالب (صورة شاشته + اسمه + IP) مع تحكمات جماعية (قفل الكل / فتح الكل / تمويه الكل / رسالة للكل)
- **مودال Live Show لجهاز واحد** (تكبير + قفل + تنبيه + إنذار صوتي)
- **مودال دليل تثبيت عميل الويندوز** (روابط تحميل `.bat`)
- **مودال مواقيت الصلاة وجدول الحصص** (تابين)
- **مودال السبحة الإلكترونية** (عدّاد دائري SVG + أهداف 33/100/لا نهاية + دورات + صوت بشري للتسبيح)
- بانر السلاوات الجماعية + بانر إشعار عائم عام

---

## 6. الميزات "الحساسة" اللي لازم نفهمها كويس

### 6.1 "زر البشمهندسة" (Panic / Stealth Button)
- **أي طالب** (مش الأدمن فقط) يقدر يفعّله بالضغط على الزر الأحمر، أو `F2`، أو ضغط `Esc` مرتين بسرعة.
- بيبعت `TRIGGER_GLOBAL_PANIC` عبر Socket.IO → السيرفر يعمل broadcast `GLOBAL_STEALTH_ENGAGED` **لكل الأجهزة المتصلة فورًا** (أقل من 15ms حسب تعليق الكود).
- على كل جهاز: يتغيّر عنوان التبويب والأيقونة لعنوان امتحان Flutter، يتوقف أي صوت/بث شاشة/راديو، وتظهر شاشة كاملة فيها iframe لكويز حقيقي (`physics.html` أو `flutter.html`).
- **الإغلاق**: 
  - `F3` أو الزر المحلي → يسأل عن كلمة السر الموحّدة ويُغلق **على هذا الجهاز فقط** (لا يؤثر على الباقي).
  - زر "فك للجميع" 👑 → يظهر فقط لو الجهاز أدمن، ويبعث `TRIGGER_STEALTH_RELEASE` (أو من لوحة تحكم الأدمن) فيُغلق عند الجميع.
- الحالة (`isStealthEngaged`) محفوظة في الذاكرة + `system_settings` في قاعدة البيانات.

### 6.2 NetSupport — مراقبة وتحكم كامل في أجهزة المعمل
فيه **طريقتان متوازيتان** لالتقاط شاشة الطالب:
1. **تصوير صفحة المتصفح نفسها (Zero-request)**: كل طالب (غير الأدمن) بيصور شاشة المتصفح بتاعه عبر `html2canvas` **تلقائيًا كل 2.5 ثانية بدون أي إذن أو إشعار ظاهر له**، وكمان فورًا لما يبدّل تاب أو يصغّر النافذة (`visibilitychange`) — وفي هذه الحالة تُرسل "لقطة تحذيرية" بها اسمه وIP ووقت آخر نشاط. تُرسل كـ `netsupport_client_frame` عبر Socket.
2. **عميل ويندوز حقيقي (`lab-agent.ps1`)**: يُثبَّت على جهاز الطالب (عبر `install-student-agent.bat`) ويُضاف لـ Startup ويعمل **مخفي بالكامل بدون نافذة** (عبر VBS)، ويأخذ Screenshot **لكامل سطح مكتب ويندوز الحقيقي** (مش فقط المتصفح) كل 1.5 ثانية ويرسله HTTP POST إلى `/api/netsupport/frame`.
- الأدمن فقط يشاهد هذه الشاشات في مودال NetSupport Grid، ويملك: قفل شاشة أي جهاز/الكل، فتح، تفعيل تمويه الفيزياء على جهاز/الكل، إرسال رسالة تنبيه، تشغيل إنذار صوتي، فتح رابط معيّن على جهاز الطالب (`navigate_url`)، أو طرده بالكامل من الاتصال.
- **ملاحظة توثيقية مهمة (وليست قرارًا هندسيًا منّي)**: الالتقاط التلقائي للمتصفح يحصل **بدون أي شاشة موافقة أو إشعار دائم للطالب** أنه يُراقَب فعليًا طول الوقت (غير التلميح العام في اسم الميزة "مراقبة المعمل" الظاهر فقط للأدمن). هذا سلوك مقصود من تصميم السيرفر الحالي (مُعلّم يراقب أجهزة فصله/معمله المملوكة للمدرسة)، وتوثيقه هنا لأنه نقطة UX/شفافية مهمة لو حبينا نراجعها لاحقًا — مش لازم نغيّر فيها حاجة الآن.

### 6.3 نظام الـ Streaks والتجميد
- لكل زوج مستخدمين (`user_a`, `user_b` بترتيب ثابت) سجل واحد في جدول `streaks`.
- التفاعل في نفس اليوم: كل 3 رسائل متبادلة = `+1` على الـ Streak.
- بين الأيام: فرق ≤ 5 أيام = `+1` بسيط، أكثر من 5 أيام = Reset جزئي (نص القيمة القديمة + 1) بدل الصفر الكامل (grace period "متسامح" تربويًا).
- الجمعة والسبت: `is_weekend_freeze = true` دايمًا، فيظهر ❄️🔥 ويُفترض عدم كسر الاستريك فيهم (لكن المنطق الفعلي في `recordInteraction` **ما بيمنعش** زيادة العداد في الويك إند، فقط يعلّم الصف بـ `is_frozen=1` — القيمة بتتحدث عادي. التجميد شكلي/عرضي بصريًا أكتر من كونه قفل فعلي في المنطق).

---

## 7. قاعدة البيانات (SQLite)

جداول: `users`, `messages`, `message_reactions`, `stories`, `story_views`, `streaks`, `airdrop_files`, `groups`, `group_members`, `group_join_requests`, `music_library`, `system_settings`.

ملاحظات:
- لا توجد جداول خاصة بالـ Admin Actions Log أو Audit Trail — أي عملية أدمن (طرد، حذف، قفل) غير مسجّلة تاريخيًا.
- `system_settings` جدول key/value عام لحفظ (`focus_mode`, `stealth_active`, `whiteboard_locked`, `shared_codepad`).
- `tasbeeh.json` عدّاد مستقل تمامًا عن SQLite (ملف JSON بسيط) — عدم تجانس في مكان تخزين الحالة.

---

## 8. محرك الـ Realtime (أهم أحداث Socket.IO)

| الحدث | الوصف |
|---|---|
| `register_presence` | تسجيل حضور الجهاز بعد تسجيل الدخول |
| `send_message` / `typing_start/stop` / `toggle_reaction` / `delete_message` | الشات |
| `whiteboard_draw_step` / `whiteboard_clear_board` / `request_whiteboard_history` | السبورة |
| `codepad_update` / `codepad_request_sync` | الكشكول |
| `TRIGGER_GLOBAL_PANIC` / `TRIGGER_STEALTH_RELEASE` | البشمهندسة |
| `screen_share_*` + `webrtc_offer/answer/ice_candidate` | بث الشاشة (WebRTC signaling فقط، السيرفر لا يخزّن الفيديو) |
| `radio_play/pause/seek/stop` + `radio_sync_state` | مزامنة الموسيقى |
| `netsupport_client_frame` | رفع لقطة شاشة الطالب (نسخة الـ Socket من REST endpoint) |
| `tasbeeh_increment` / `dhikr_spoken_broadcast` / `salawat_broadcast` | التسبيح والسلاوات الجماعية |

---

## 9. نقاط القوة الحالية (تستحق الحفاظ عليها بعد التصميم الجديد)
- تجربة "صفر إعداد" فعلية: فتح رابط فقط، لا تسجيل حساب حقيقي.
- مزامنة لحظية سلسة لعدد كبير من الميزات (سبورة، كود، موسيقى، تمويه) في نفس الوقت.
- تغطية واسعة جدًا للسيناريوهات الصفّية الحقيقية (جدول حصص، صلاة، استريك، مزاج طلاب مصري خفيف الظل في النصوص).
- فصل منطقي جيد في الباكند (`services/`) حتى مع ضخامة `server.js`.

---

## 10. ملاحظات ومشاكل الشكل/UX الحالية (Pre-Redesign Audit)

### 10.1 مشاكل بصرية/تصميمية عامة
1. **Tailwind عبر CDN في بيئة إنتاج فعلية** (`cdn.tailwindcss.com`) — بطيء (يولّد CSS في المتصفح كل تحميل)، وبيطبع تحذير رسمي في الـ Console بعدم الاستخدام بالإنتاج. لازم build حقيقي (Vite/PostCSS) لو عايزين شكل "شركة كبيرة محترفة".
2. **إفراط شديد في الإيموجي** داخل كل عنوان/زر/نص تقريبًا (🚀⚡👑🔥📿🕌...) — يعطي طابع "تطبيق هواية" بدل هوية بصرية Enterprise نظيفة. لازم نظام أيقونات حقيقي (SVG/Icon set) بديل.
3. **ألوان بلا نظام (Design Tokens) واضح**: كل زر وكل مودال له لون حدّ/خلفية مختلف (cyan, purple, indigo, emerald, pink, amber, red...) بدون منطق موحّد لربط اللون بالمعنى (مثلاً لازم "التحذير/الخطر" أحمر فقط، "نشط/مباشر" أخضر فقط... إلخ). حاليًا الألوان موزّعة عشوائيًا على الميزات.
4. **أحجام خطوط صغيرة جدًا بشكل متكرر** (`text-[9px]`, `text-[10px]`, `text-[11px]`) في عناصر مهمة (أوقات الصلاة، عدّادات، تنبيهات) — مشكلة Accessibility وقراءة على الموبايل.
5. **هيدر علوي مزدحم جدًا**: أكثر من 8 أزرار/شارات في صف واحد `overflow-x-auto` — على شاشة لابتوب صغير أو موبايل بيتحول لسكرول أفقي طويل وصعب الاستخدام، ولا يوجد تجميع منطقي (أدوات الفصل / أدوات شخصية / أدوات الأدمن) ولا قائمة "المزيد".
6. **تعارض RTL/LTR غير متقن في بعض الأماكن**: استخدام `pl-1 border-r pr-2` (يسار+يمين مختلط) في بطاقة توقيت الإسكندرية بالهيدر، و`dir="ltr"` مفروض على بعض الحقول وسط صفحة `dir="rtl"` بدون معالجة محاذاة الأيقونات المصاحبة.
7. **أكثر من 20 Modal منفصل بنفس القالب البصري** (`glass-panel-elevated rounded-3xl`) لكن بأحجام/حشوات غير متسقة (`max-w-sm`, `max-w-md`, `max-w-lg`, `max-w-xl`, `max-w-3xl`, `max-w-4xl`, `max-w-5xl`, `max-w-6xl` كلها مستخدمة بدون نظام Breakpoints موحّد لحجم المودال حسب نوع المحتوى).
8. **تضارب تسمية الدوال**: بعض الأزرار تستخدم `showModal()/hideModal()` وأخرى `closeModal()` (مثال: `holyQuranRadioModal` يستخدم `closeModal` بينما باقي المودالز `hideModal`) — دليل على عدم توحيد نمط واحد عبر وقت التطوير.
9. **رسالة خطأ كلمة السر تكشف الباسورد الحقيقي فعليًا**: `"كلمة السر غير صحيحة! الباسوورد هو [REDACTED_SHARED_PASSWORD]"` — وأيضًا حقل الباسورد بالفورم له `value="[REDACTED_SHARED_PASSWORD]"` معبّأ مسبقًا ظاهر كـ placeholder حقيقي. هذا أسلوب مقصود هنا (باسورد فصل مشترك وليس سرّي فرديًا)، لكنه يستحق مراجعة شكل الرسالة عند إعادة التصميم.
10. **لا يوجد Loading/Empty/Error states متّسقة** عبر كل القوائم (رسائل، نتائج موسيقى، أجهزة NetSupport) — كل قسم يكتب حالته الخاصة بنص عادي بدل نظام Skeleton/Spinner موحّد.
11. **إصدار الكاش في الكود**: `app.js?v=4.6.7` Hardcoded في HTML — لازم تحديثها يدويًا كل مرة بدل نظام Cache-busting تلقائي (hashing عبر Build).
12. **لا نظام Dark/Light** — فقط Dark ثابت (`class="dark"` مفروض على `<html>` دائمًا)، لا مشكلة إن كان قرار تصميمي، لكن يستحق التوثيق كقرار صريح قبل إعادة التصميم.
13. **تعدد أنماط الأزرار الدائرية "✕" للإغلاق** بأحجام مختلفة (`w-6 h-6`, `w-7 h-7`, `w-8 h-8`) بدون مكوّن واحد موحّد لزر الإغلاق.
14. **كثافة نصية عالية بالعربي داخل عناصر صغيرة** (أزرار بعرض محدود) تؤدي لـ line-wrap غير مريح، مثل: "فتح البث المباشر على موقع holyquranradio.com الرسمي ↗" بزر واحد طويل جدًا.

### 10.2 مشاكل بنيوية/تقنية تؤثر على أي إعادة تصميم
15. **كل منطق الواجهة في ملف JS واحد (6282 سطر) وملف HTML واحد (1878 سطر)** — أي إعادة تصميم UI حقيقية (فصل لمكوّنات/صفحات) ستحتاج إعادة هيكلة معمارية كبيرة (لا يوجد حاليًا أي تقسيم Component-based)، وهذا قرار يجب اتخاذه بوعي قبل البدء: إعادة تنظيم تدريجي فوق البنية الحالية، أو إعادة بناء بمكوّنات (مثلاً عبر Web Components أو framework خفيف) مع الحفاظ على نفس الـ APIs/Sockets.
16. **لا يوجد نظام Design Tokens/متغيرات CSS شامل** — فقط متغيرات محدودة في `:root` (`--bg-primary`, `--accent-cyan`...) غير مستخدمة فعليًا في أغلب الكلاسات (الكود يستخدم كلاسات Tailwind المباشرة بالألوان الصريحة `bg-cyan-500` بدل المتغيرات)، لذلك تغيير الهوية البصرية بالكامل سيتطلب تعديل آلاف الكلاسات المباشرة بدل تغيير مكان واحد.
17. **State management بسيط جدًا** (كائن عام `STATE` في JS) — كافٍ للحجم الحالي لكنه سيصعّب أي إعادة تصميم تفاعلي أكبر (مثلاً لو عايزين Routing حقيقي بين "صفحات" بدل Modals فوق صفحة واحدة).

---

## 11. خلاصة الاستعداد لإعادة التصميم

المنصة وظيفيًا غنية جدًا ومتكاملة، لكنها بُنيت بأسلوب "ميّزة فوق ميّزة" بدون نظام تصميم (Design System) موحّد من البداية — فكل قسم جديد اخترع ألوانه وأحجامه الخاصة. الأولوية المنطقية لإعادة التصميم:

1. تثبيت **Design Tokens** واحدة (ألوان/مسافات/زوايا/ظلال/خطوط) تُستخدم في كل مكان بدل الكلاسات العشوائية.
2. توحيد **نظام الأيقونات** (إزالة اعتماد الإيموجي الكامل أو تقليله لصالح Icon set حقيقي + إيموجي محدود كلمسة شخصية فقط).
3. إعادة تنظيم **الهيدر** لمجموعات منطقية (أدوات الفصل / حسابي / أدوات الأدمن) مع "المزيد" بدل صف أفقي طويل.
4. توحيد **قالب المودالز** (حجم، حشو، زر إغلاق، عنوان) في مكوّن واحد قابل لإعادة الاستخدام.
5. مراجعة التباين وأحجام الخطوط الصغيرة لصالح قراءة أوضح.
6. توثيق قرار RTL بالكامل وتصحيح نقاط التعارض مع LTR.

هذا الملف جاهز كمرجع نبدأ بيه نقاش المشاكل المحددة والتطويرات المطلوبة قبل تنفيذ التصميم الجديد.

~~~~


### المصدر: docs/ROADMAP_NEXT.md

~~~~md
# خطة الشغل الجاية — "نؤطة" (No2ta)

## حالة التنفيذ (آخر تحديث: نفس الجلسة، بعد التنفيذ)
- ✅ باگ الـ Bat/IP: نظام اكتشاف تلقائي عبر UDP broadcast — مُختبر فعليًا وشغال.
- ✅ UI: الشعار، أيقونة AirDrop/الهيدر، صندوق الأفاتار، مواقيت الصلاة الجانبية، ضغط الهيدر لأيقونات بدل نص طويل.
- ✅ مكتبة القرآن الكريم: 8 قراء (المنشاوي، عبد الباسط، الحصري، السديس، العفاسي، المعيقلي، محمد أيوب، ياسر الدوسري) من mp3quran.net — بث متزامن حقيقي (currentTime sync + تصحيح دوري كل 20 ثانية + تقدم تلقائي للسورة التالية) + زرار "تشغيل عندي بس" — مُختبر فعليًا وشغال.
- ✅ تحسين الـ Autoplay لصلي على محمد والأذكار (فك القفل تلقائيًا أول ما حد يلمس الصفحة).
- ✅ تحسين بحث الأغاني: ضفت Deezer كمصدر ثالث احتياطي (معاينة 30 ثانية لو المصدرين التانيين ملقوش حاجة).
- ✅ امتحان الفيزيكس/فلاتر: حفظ الدرجات في قاعدة البيانات + لوحة متصدرين (أعلى اليوم، أعلى على الإطلاق، أفضل 10) — مُختبر فعليًا وشغال.
- ✅ الدروب داونز: استبدلت شكل المتصفح الافتراضي بقايمة مصممة بهوية التطبيق.
- ✅ تحدي الرياضيات السريع: لعبة تنافسية حقيقية لحظية (Socket.IO) — أول واحد يجاوب صح ياخد نقطة، 8 أسئلة، لوحة نقاط حية + نتيجة نهائية — مُختبرة فعليًا وشغالة.
- 🟡 الإيموجي: شلت دفعة كبيرة تانية (AirDrop، السبورة، الكشكول، التسبيح، الجروبات، الاستوري، صلي على محمد، بث الشاشة، NetSupport جزئيًا، مواقيت العطلة). لقيت ومسحت 3 أماكن فيها JS بيكتب فوق الأيقونة الجديدة بالإيموجي القديم (باگ حقيقي، نفس نمط اللي قابلته في الراديو). الباقي (تفاصيل مودال الأدمن الكامل، تفاصيل NetSupport، بعض رسائل showNotification) اتأجل لجلسة تانية — مش كل حاجة، بس التقدم حقيقي ومُختبر.
- 🟡 الألعاب: عملت لعبة واحدة حقيقية وشغالة (مش 10 ألعاب نص مشتغلين) — تحدي الرياضيات. باقي الألعاب (سباق الكتابة، خمّن الكلمة، تريفيا) ممكن تتضاف بنفس النمط في جلسة تانية لو عايز.
- ℹ️ مراجعة شاملة للباگات: عملت اختبار فعلي (مش قراءة كود بس) للـ: تسجيل الدخول، الشات، AirDrop، مكتبة القرآن والمزامنة، الدروب داونز، امتحان الفيزيكس ولوحة المتصدرين، تحدي الرياضيات. كل حاجة شغالة من غير أخطاء console. مكنش عندي وقت أختبر كل ميزة ميزة (الستوريز، الجروبات بالتفصيل، NetSupport الكامل، الويت بورد) فعليًا بالماوس — دي نقطة لمتابعة لاحقة.


> هذا الملف خطة عمل داخلية كتبتها لنفسي بعد طلب شامل من صاحب المشروع. الهدف إني أنفّذها بالترتيب من غير ما أحتاج موافقة على كل خطوة، لأن صاحب المشروع مش هيكون متواجد يراجع أول بأول. هحدّث حالة كل بند هنا بعد ما أخلصه.

**تاريخ الكتابة:** 2026-11-04
**قاعدة أساسية:** مفيش `git commit`/`push` إلا لما كل حاجة هنا تتعمل وتتجرب فعليًا، زي ما اتفقنا.

---

## 1. باگ الـ IP الثابت في Start_No2ta.bat (أولوية قصوى)

**المشكلة الحقيقية (لقيتها):** في `Start_No2ta.bat` سطر 25، أي جهاز طالب بيفتح المتصفح على عنوان **مكتوب حرفيًا جوه الكود**: `http://192.168.20.54:5000`. يعني لو الأدمن اتغيّر الـ IP بتاعه (الراوتر بيديله IP جديد، أو اشتغل من فصل/شبكة تانية)، كل الأجهزة هتفضل تحاول تفتح على نفس الـ IP القديم وتفشل.

**الحل:** نظام اكتشاف تلقائي (Auto-Discovery) عبر الشبكة بدل الـ IP الثابت:
- السيرفر (عند التشغيل) يبث (UDP Broadcast) رسالة صغيرة كل ثانيتين على الشبكة المحلية كلها بتقول "أنا هنا على العنوان ده".
- ملف الـ `.bat` بتاع الطالب (بدل ما يفتح IP ثابت) يشغّل سطر PowerShell مدمج بيسمع لثانيتين/تلاتة على نفس القناة، يلقط أي بث جاي، ياخد منه الـ IP الحقيقي الحالي، ويفتح المتصفح عليه. لو ملقاش حاجة (مفيش سيرفر شغال) يرجع لرسالة واضحة بدل ما يفتح حاجة غلط.
- **الحالة:** ✅ خطة واضحة وقابلة للتنفيذ فورًا.

---

## 2. مزامنة الصوت بين كل الأجهزة (موسيقى + قرآن + صلاة على النبي)

**الوضع الحالي بعد الفحص:**
- الموسيقى العادية فعلاً عندها آلية مزامنة (السيرفر بيحسب `currentTime` بناءً على وقت البداية، والعميل بيصحّح لو الفرق أكتر من ثانيتين) — بس التصحيح ده بيحصل بس لما حدث جديد يوصل (تشغيل/إيقاف/شخص جديد دخل)، مش بشكل مستمر، فمع الوقت الأجهزة بتـ"تزحلق" عن بعض شوية.
- **إذاعة القرآن** حاليًا عبارة عن ريلاي حي لراديو خارجي (اللي ظبطته الجلسة اللي فاتت عشان يعدّي الفايروول) — المشكلة إن كل جهاز بيتصل في وقت مختلف وبيعمل Buffering مختلف، فمفيش ضمان تزامن حقيقي، وده بالظبط اللي حضرتك لاحظه.
- **صلي على محمد** أصلاً بتشتغل بمنطق "إشارة واحدة لكل الأجهزة تشغّل نفس الملف المحلي عندها فورًا" — ده شكل تزامن سليم أصلاً (الفرق بينهم أجزاء من الثانية بسبب سرعة الشبكة بس)، المشكلة الأرجح إن بعض الأجهزة ممكن يرفضوا يشغّلوا الصوت تلقائي (Autoplay Block) من غير ما تبان رسالة واضحة إنه محتاج ضغطة واحدة يفعّل بيها الصوت أول مرة.

**الخطة:**
1. **إذاعة القرآن:** بدل الريلاي الحي الهش، هستخدم مكتبة تسجيلات كاملة من مصدر موثوق ومجاني 100% (mp3quran.net) — فيها الشيخ المنشاوي ("الشناوي" اللي حضرتك قصده) وقراء تانيين، ملفات صوت ثابتة بتشتغل زي أي أغنية عادية. كده إذاعة القرآن هتدخل في نفس نظام المزامنة الموجود للموسيقى (مضمون أكتر من بث حي، ومش هيتحجب لأن الموقع مش موجود على لستة الحجب أصلاً).
2. **تصحيح مستمر (Heartbeat Sync):** هضيف نبضة مزامنة كل 15-20 ثانية من السيرفر لكل الأجهزة المتصلة وقت التشغيل، عشان أي جهاز "زحلق" شوية يترجع في مكانه تلقائي من غير حتى حد يحس.
3. **صلي على محمد:** هتأكد إن فيه رسالة واضحة "دوس هنا عشان الصوت يشتغل" تظهر فورًا لو المتصفح رفض التشغيل التلقائي، بدل ما يفشل بصمت.
4. **زرار "شغل عندي بس":** هضيف زرار بجانب أي أغنية في المكتبة يخلّيك تسمعها على جهازك إنت بس من غير ما تتبث على كل الفصل (منفصل تمامًا عن زرار "بث للفصل" الموجود).

---

## 3. مكتبة قرآن محلية موثوقة (بديل عن الـ API الحالي)

**المشكلة:** الـ API اللي رابطين بيه دلوقتي مفيهوش قرآن أصلاً (مكتبة أغاني هندية بتغطي شوية عربي بس مش قرآن).
**الحل:** هربط مباشرة بـ mp3quran.net (موقع رسمي، مجاني، مفيهوش أي قيود، فيه عشرات القراء منهم الشيخ المنشاوي بالمرتّل والمجوّد) — هعمل قائمة قراء تقدر تختار منها، وكل سورة بتتحمّل كملف حقيقي موجود فعلاً (مش رابط هيتقفل بكرة).

---

## 4. تحسين الـ API بتاع الأغاني العادية

**الصراحة:** مفيش API مجاني "يجيب أي أغنية من أي حتة" فعلاً موجود بشكل قانوني وموثوق — سبوتيفاي وساوند كلاود قافلين الوصول المجاني للتريك الكامل من زمان لحماية حقوق الملكية. اللي شغال حاليًا (JioSaavn عبر مصدرين احتياطيين) هو فعليًا من أحسن الخيارات المجانية المتاحة لأغاني كاملة (مش 30 ثانية بس زي Deezer). اللي هعمله: أظبط الاستعلام والـ fallback عشان يلاقي الأغاني العربية أكتر (أسماء فنانين عرب بالظبط، محاولات بحث متعددة)، وأتأكد إن لو مش لاقي حاجة بيوضح ده للمستخدم بدل ما يفضل معلّق.

---

## 5. امتحان الفيزيكس/فلاتر — تفاعلي بدرجات + قائمة المتصدرين

**الوضع الحالي:** `physics.html` (ده اللي فعليًا بيفتح على زرار F2 — ملف `flutter.html` مش مستخدم فعليًا، موجود بس مش مربوط بحاجة) أصلاً فيه أسئلة تفاعلية ودرجة بتتحسب جوه الصفحة، بس الدرجة دي **مش بتتحفظ في أي حتة** — تختفي لما تقفل الصفحة، ومفيش أي مقارنة بين الطلاب.

**الخطة:**
- أضيف Endpoint جديد يحفظ الدرجة في قاعدة البيانات لما الطالب يخلّص (اسمه + درجته + وقت التسليم).
- أضيف قائمة متصدرين (Leaderboard) — أعلى درجة النهاردة، وأعلى درجة على الإطلاق، وربما "سلسلة" (Streak) لمين بيحافظ على مركزه.
- أعرضها في مكان واضح (ممكن داخل لوحة تحكم الأدمن، أو شاشة تظهر بعد التسليم مباشرة).
- محتوى الأسئلة نفسه **مش هيتغيّر** زي ما قلت.

---

## 6. ألعاب ذكاء وسرعة تنافسية (ميزة جديدة كبيرة)

طلب حضرتك حوالي 10 ألعاب. بص بصراحة: عشان كل لعبة تبقى شغالة بشكل حقيقي (أكتر من واحد يدخلوا مع بعض، نتيجة لحظية، تنافس حقيقي) ده مجهود هندسي حقيقي لكل لعبة لوحدها، مش مجرد "واجهة". هبدأ بمجموعة أصغر لكن **شغالة فعلاً وممتعة** بدل 10 ألعاب نص مشتغلين، وأقدر أزود عليها بعدين. اقتراحي الأولي (هراجعه وأنا بصمم):
1. **سباق سرعة الكتابة (Typing Race)** — كل الفصل يكتبوا نفس الجملة، مين يخلص أول.
2. **تحدي الرياضيات السريع (Quick Math)** — مسائل حساب تظهر بالتتابع، أسرع إجابة صح تاخد نقطة.
3. **خمّن الكلمة (سريع)** — تلميح يظهر، أول واحد يكتب الإجابة الصح ياخد نقطة.
4. **ذاكرة الألوان/الأرقام (Simon Says نسخة فصل)** — تسلسل بيكبر، مين بيغلط يخرج.
5. **تريفيا سريعة (Quiz Battle)** — أسئلة عامة/دراسية بالتتابع، ترتيب حسب السرعة والصحة.

كل لعبة هتدي نقط، والنقط دي تتجمّع في **لوحة شرف عامة للفصل كله** (زي الـ Streaks الموجودة أصلاً) — ده أحسن من 10 ألعاب منفصلة كل واحدة ليها لوحة لوحدها.

---

## 7. إصلاحات UI محدّدة ذكرها حضرتك

| المشكلة | الحل |
|---|---|
| شكل أيقونة "نؤطة" فوق صفحة الدخول مش حلو | شعار جديد بسيط ونظيف بدل الإيموجي/الأيقونة الحالية |
| أيقونة "⚡ AirDrop" شكلها مش حلو | أيقونة Lucide احترافية (نفس المنهج اللي بدأناه في الهيدر) |
| "ارفع صورة من جهازك" وأزرار اختيار الإيموجي شكلهم مش احترافي | إعادة تصميم كاملة لصندوق اختيار الأفاتار |
| مواقيت الصلاة في الشريط الجانبي متكدسة فوق بعض وخط صغير | إعادة تخطيط الشبكة (grid) + خط أوضح وأكبر شوية |
| أزرار الهيدر (AirDrop/السبورة/الكشكول...) بعضها مخبي برا الشاشة محدش بيشوفه | إعادة تفكير في مكان الأزرار دي — بدل صف أفقي واحد طويل، نفكر في قائمة "أدوات" منسدلة أو تبويب مخصص بدل الزحمة |

---

## 8. استكمال شغل تاني كان موقوف

- باقي 209 إيموجي داخل الـ 20+ مودال (AirDrop، الأدمن، NetSupport...) — هتتشال مع نفس شغل توحيد شكل المودالز.
- توحيد شكل الـ 20+ مودال (القالب الموحّد من `DESIGN_SYSTEM.md` §7.2) كان متوقف، هكمله مع بعض.

---

## 9. مراجعة شاملة للباگات (QA Pass)

هدخل أختبر كل ميزة بنفسي (مش بس أقرا الكود) — شات، جروبات، ستوريز، AirDrop، السبورة، الكشكول، بث الشاشة، الموسيقى، القرآن، التسبيح، الأدمن، NetSupport، البانيك — وأصلح أي حاجة بتتكسر أو بتطلع كلام فوق كلام زي ما وصفت.

---

## 10. آخر خطوة: Commit + Push على GitHub

لما كل حاجة فوق تخلص وتتجرب فعليًا (مش بس تتكتب)، هعمل commit منظم ونرفع على GitHub. **مش هينفذ قبل كده.**

---

## ترتيب التنفيذ الفعلي

1. باگ الـ Bat/IP (سريع ومؤثر جدًا).
2. UI: الشعار، أيقونة AirDrop، صندوق الأفاتار، مواقيت الصلاة، إعادة ترتيب الهيدر.
3. القرآن: المكتبة المحلية + ربطها بنظام المزامنة + نبضة التصحيح المستمر.
4. صلي على محمد: تحسين الـ Autoplay.
5. زرار "شغل عندي بس".
6. تحسين بحث الأغاني.
7. امتحان الفيزيكس: حفظ الدرجات + لوحة المتصدرين.
8. استكمال المودالز + شيل باقي الإيموجي.
9. مراجعة شاملة للباگات.
10. الألعاب التنافسية (أكبر بند، هبدأ فيه آخر حاجة لو فاضل وقت، أو أكمله في جلسة تانية).
11. Commit + Push.

~~~~


### المصدر: README.md

~~~~md
# 💬⚡ منصة "نؤطة" (No2ta) - شبكة الفصل الاجتماعية والسرية

تطبيق تواصل اجتماعي ومشاركة متكامل مصمم خصيصاً ليعمل على **الشبكة المحلية للفصل (Classroom LAN)** بين الزملاء، يجمع أرقى ميزات **WhatsApp + Instagram + Messenger** مع نظام استريكات مجمد أوتوماتيكياً في الويك إند، وزر الإخفاء المتزامن السري المشهور بـ **"زر البشمهندسة"** الذي يعرض كويز ونموذج إجابة مادة الفيزياء على جميع الأجهزة في أجزاء من الثانية!

---

## 🌟 أبرز ميزات المنصة:

1. **بوابة دخول محمية ومخصصة للفصل**:
   - دخول مؤمّن بكلمة مرور سرية خاصة بطلاب الفصل فقط.
   - 👑 **جهاز الأدمن الدائم**: تم تعيين **هذا الجهاز** رسمياً كأدمن دائم ومطلق للمنصة عبر الماك أدريس الفيزيائي (`D0:8E:79:18:9F:A0`)؛ أي دخول من هذا الجهاز يُمنح رتبة الأدمن تلقائياً وبدون الحاجة لطلب صلاحيات!
2. **التعرف التلقائي بالـ IP والـ MAC Address**:
   - ربط بروفايل كل طالب بجهازه الفيزيائي تلقائياً.
3. **ترسانة WhatsApp**:
   - شات عام للفصل وشاتات خاصة مباشرة (1-to-1).
   - تسجيل الملاحظات الصوتية (Voice Notes) مع موجات صوتية ومشغل مدمج.
   - مشاركة الصور، الفيديوهات، ملفات الـ PDF، والمستندات مع حفظها على السيرفر المركزي (`مش Local`).
   - مؤشر الكتابة المباشر وتفاعلات الإيموجي على الرسائل.
4. **ترسانة Instagram**:
   - استوريهات يومية (Stories) نصية بجرادينت أو وسائط بصور وفيديوهات.
   - حلقة استوري متوهجة حول الأفاتار تدل على وجود استوري جديد.
   - عداد مشاهدي الاستوري وإمكانية التفاعل معه.
5. **نظام الاستريكات (Streaks) وتجميد الويك إند**:
   - احتساب أيام التواصل المتواصل بعلامة النار (`🔥`).
   - **قاعدة التجميد الذهبية**: يومي **الجمعة والسبت** يتجمد العداد أوتوماتيكياً (`❄️🔥`) لحماية الاستريك من الانقطاع خلال العطلة!
6. **Classroom AirDrop**:
   - تبادل ملفات ومشاريع كبيرة بسرعة الكابل والواي فاي الكاملة (حتى 100MB/s) **بدون استهلاك باقة النت**.
7. **الرسائل ذاتية التدمير (Disappearing Messages)**:
   - رسائل بمؤقت احتراق ذاتي يبدأ من **ثانيتين فقط (`2s`)** إلى 5 دقائق، تحذف نفسها نهائياً من قاعدة البيانات وتختفي باحترافية من الشاشات.
8. **حذف الرسائل والاستوريهات المباشر (Message & Story Deletion)**:
   - يمكن لأي طالب حذف رسالته الخاصة نهائياً للجميع (`Unsend`) بضغطة زر وتختفي فوراً بلور وأنيميشن من كل الشاشات.
   - يمكن حذف الاستوري الخاص بك، بينما يمتلك الأدمن/المضيف صلاحية حذف أي رسالة أو استوري لأي مستخدم.
9. **السبورة التفاعلية الحية المشتركة (Live Whiteboard)**:
   - رسم وتوضيح مسائل الفيزياء والدوائر الكهربائية جماعياً مع ألوان متعددة، ممحاة، وتصدير الصورة كـ PNG.
10. **🚨 زر البشمهندسة والتحكم السري بالمفاتيح**:
    - اضغط **`F2`**: يفتح كويز ونموذج إجابة الفيزياء **على جميع الطلاب فوراً وبشكل متزامن** في أجزاء من الثانية!
    - اضغط **`F3`**: يغلق شاشة الفيزياء **على جهازك أنت فقط** في سرية تامة دون كشف بقية الأجهزة أو فك التمويه عنهم!
    - فك التمويه للجميع: بكلمة المرور أو بضغطة واحدة من لوحة الأدمن.
10. **لوحة تحكم الأدمن الخارقة (Admin Superpowers)**:
    - 📢 **إذاعة الفصل العامة**: إرسال تنبيه طارئ يظهر في منتصف شاشات جميع الطلاب بصوت تنبيهي.
    - 🛡️ **زر "البشمهندسة مشيت"**: فك التمويه عند جميع الطلاب وإعادتهم للشات بضغطة زر واحدة.
    - 🤫 **وضع التركيز الدراسي**: قفل الشات مؤقتاً للشرح.
    - 📡 **رادار الأجهزة**: معاينة الـ IP والـ MAC Address لكل جهاز متصل مع إمكانية طرد أي مستخدم.
11. **كشكول الأكواد والنصوص المشترك (Shared CodePad & Plain Text Bin)**:
    - مساحة عمل ونصوص خام وكود برمجي مشتركة وفورية بين جميع أجهزة الفصل مع مزامنة لحظية (Live Sync).
    - زر نسخ سريع بضغطة واحدة (`📋 نسخ كل الكود`) لنقل الكود للحافظة فوراً بدون تعقيد مع دعم كامل للمتصفحات والشبكة المحلية (HTTP LAN).
    - زر إرسال للشات مباشرة لنقل الكود المكتوب في الكشكول إلى غرفة المحادثة.
    - زر مخصص في الشات (`</>`) لمشاركة مقتطفات الأكواد البرمجية (Code Snippets) بتنسيق داكن مريح ومحدد باللغة وزر نسخ مباشر لكل كود.

---

## 🚀 طريقة التشغيل السريعة:

1. انقر نقراً مزدوجاً على ملف:
   ```cmd
   Start_No2ta.bat
   ```
2. سيتم تشغيل السيرفر وفتح المتصفح تلقائياً على:
   ```
   http://localhost:5000
   ```
3. لدخول زملاء الفصل:
   - افتح نافذة **QR Code** من أعلى التطبيق واجعل الزملاء يمسحون الكود بكاميرا الموبايل، أو يدخلون على الرابط المحلي الظاهر في الشاشة (مثلاً: `http://192.168.20.54:5000`).
4. أدخل كلمة سر الفصل السرية، واختر لقبك وصورتك الرمزية وانطلق!

~~~~


### المصدر: .gitignore

~~~~
# Dependencies
node_modules/
package-lock.json

# SQLite Database & Runtime logs
data/*.db
data/*.db-journal
*.log

# Uploads content (preserve folder structure via .gitkeep)
uploads/media/*
!uploads/media/.gitkeep
uploads/audio/*
!uploads/audio/.gitkeep
uploads/stories/*
!uploads/stories/.gitkeep
uploads/airdrop/*
!uploads/airdrop/.gitkeep
uploads/avatars/*
!uploads/avatars/.gitkeep
uploads/music/online_*
uploads/music/cover_*
uploads/music/test_*
uploads/music/*_cache_*
uploads/quran/*
!uploads/quran/.gitkeep

# OS generated files
.DS_Store
Thumbs.db

~~~~


### المصدر: data/db.js

~~~~js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'no2ta.db');
const db = new sqlite3.Database(dbPath);

// Helper for Promisified Queries
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const all = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
};

// Initialize Tables
const initDB = async () => {
    await run(`PRAGMA foreign_keys = ON;`);

    // Users
    await run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        device_id TEXT UNIQUE,
        ip_address TEXT,
        mac_address TEXT,
        nickname TEXT NOT NULL,
        avatar TEXT,
        bio TEXT DEFAULT 'طالب جامد في فصل العباقرة ⚡',
        role TEXT DEFAULT 'student',
        is_online INTEGER DEFAULT 0,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    // Messages
    await run(`CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        recipient_id TEXT,
        chat_type TEXT DEFAULT 'general',
        content TEXT,
        media_url TEXT,
        media_type TEXT,
        media_name TEXT,
        media_size INTEGER DEFAULT 0,
        is_disappearing INTEGER DEFAULT 0,
        expires_at DATETIME,
        is_read INTEGER DEFAULT 0,
        read_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // Safe migrations for existing messages table
    try {
        await run(`ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0;`);
    } catch (e) {}
    try {
        await run(`ALTER TABLE messages ADD COLUMN read_at DATETIME;`);
    } catch (e) {}

    // Message Reactions
    await run(`CREATE TABLE IF NOT EXISTS message_reactions (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        emoji TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(message_id, user_id),
        FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // Stories
    await run(`CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        media_url TEXT,
        media_type TEXT DEFAULT 'text',
        text_content TEXT,
        bg_gradient TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // Story Views
    await run(`CREATE TABLE IF NOT EXISTS story_views (
        id TEXT PRIMARY KEY,
        story_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(story_id, user_id),
        FOREIGN KEY(story_id) REFERENCES stories(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // Streaks
    await run(`CREATE TABLE IF NOT EXISTS streaks (
        id TEXT PRIMARY KEY,
        user_a TEXT NOT NULL,
        user_b TEXT NOT NULL,
        streak_count INTEGER DEFAULT 1,
        last_interaction_date TEXT,
        is_frozen INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_a, user_b),
        FOREIGN KEY(user_a) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(user_b) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // Classroom AirDrop Files
    await run(`CREATE TABLE IF NOT EXISTS airdrop_files (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER,
        file_url TEXT NOT NULL,
        downloads_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // Groups & Squads
    await run(`CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '👥',
        description TEXT DEFAULT '',
        creator_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(creator_id) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // Group Members
    await run(`CREATE TABLE IF NOT EXISTS group_members (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, user_id),
        FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // Group Join Requests (Private Group Access Approval)
    await run(`CREATE TABLE IF NOT EXISTS group_join_requests (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, user_id),
        FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // Classroom Local Music Library 🎵
    await run(`CREATE TABLE IF NOT EXISTS music_library (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT DEFAULT 'موسيقى الفصل',
        file_url TEXT NOT NULL,
        file_name TEXT,
        duration TEXT DEFAULT '',
        cover TEXT DEFAULT '',
        uploader_id TEXT,
        uploader_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    // Seed starter tracks into music_library if empty
    try {
        const existingMusic = await get(`SELECT count(*) as count FROM music_library`);
        if (!existingMusic || existingMusic.count === 0) {
            await run(`INSERT OR IGNORE INTO music_library (id, title, artist, file_url, file_name, duration) VALUES
                ('track_starter_1', 'Lofi Study Beats ☕ (تركيز ومذاكرة)', 'موسيقى الفصل هادئة', '/uploads/music/starter_lofi_study.wav', 'starter_lofi_study.wav', '0:30'),
                ('track_starter_2', 'Cyberpunk Synthwave ⚡ (حماس وبرمجة)', 'إيقاع الفصل الإلكتروني', '/uploads/music/starter_synthwave_energy.wav', 'starter_synthwave_energy.wav', '0:30'),
                ('track_starter_3', 'Midnight Chill Vibes 🌙 (استرخاء الفصل)', 'ألحان الفصل الليلية', '/uploads/music/starter_midnight_chill.wav', 'starter_midnight_chill.wav', '0:30')
            `);
        }
    } catch (e) {}

    // System Settings (Focus mode, Stealth status, etc.)
    await run(`CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );`);

    // Default settings
    await run(`INSERT OR IGNORE INTO system_settings (key, value) VALUES ('focus_mode', '0');`);
    await run(`INSERT OR IGNORE INTO system_settings (key, value) VALUES ('stealth_active', '0');`);
    await run(`INSERT OR IGNORE INTO system_settings (key, value) VALUES ('whiteboard_locked', '0');`);
    await run(`INSERT OR IGNORE INTO system_settings (key, value) VALUES ('shared_codepad', '// كشكول الأكواد والنصوص المشترك للفصل 💻⚡\n// الصق أي كود أو مسألة برمجية هنا ليراها الجميع فوراً!');`);

    // Interactive quiz scores (panic-button stealth quiz) — persisted so the classroom
    // gets a real leaderboard instead of a score that vanishes the moment the tab closes.
    await run(`CREATE TABLE IF NOT EXISTS quiz_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        nickname TEXT NOT NULL,
        quiz_id TEXT NOT NULL DEFAULT 'flutter_competency',
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        percentage REAL NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);
    await run(`CREATE INDEX IF NOT EXISTS idx_quiz_scores_quiz ON quiz_scores (quiz_id, percentage DESC);`);

    console.log('✅ SQLite Database & Tables Initialized Successfully');
};

module.exports = {
    db,
    run,
    get,
    all,
    initDB
};

~~~~


### المصدر: data/quran-reciters.js

~~~~js
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

~~~~


### المصدر: data/tasbeeh.json

~~~~json
{"total":57360}
~~~~


### المصدر: docs/design-direction-preview-v2.html

~~~~html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>نؤطة — اتجاهات بصرية جديدة (بدون إيموجي)</title>
<script src="https://unpkg.com/lucide@latest"></script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');

* { box-sizing: border-box; }
body {
    margin: 0;
    font-family: 'Cairo', sans-serif;
    transition: background .35s ease, color .35s ease;
    min-height: 100vh;
}

/* ============ THEME A: Midnight & Brass (دافئ وداكن وفخم) ============ */
[data-theme="midnight"] {
    --bg: #0B0A09;
    --surface: #161310;
    --surface-raised: #1F1A15;
    --surface-sunken: #060504;
    --border: rgba(214, 178, 110, 0.16);
    --border-strong: rgba(214, 178, 110, 0.32);
    --text-primary: #F5EFE4;
    --text-secondary: #B8AC97;
    --text-tertiary: #7C7363;
    --primary: #D6B26E;
    --primary-hover: #E8C988;
    --primary-surface: rgba(214, 178, 110, 0.12);
    --on-primary: #1A1308;
    --secondary: #8A9A8C;
    --danger: #E0604A;
    --shadow: 0 20px 50px -12px rgba(0,0,0,0.6);
}

/* ============ THEME B: Ivory & Navy (فاتح وأنيق) ============ */
[data-theme="ivory"] {
    --bg: #F6F2EA;
    --surface: #FFFFFF;
    --surface-raised: #FFFFFF;
    --surface-sunken: #EFE9DC;
    --border: rgba(16, 24, 48, 0.08);
    --border-strong: rgba(16, 24, 48, 0.16);
    --text-primary: #10182F;
    --text-secondary: #565F7A;
    --text-tertiary: #8991A8;
    --primary: #10182F;
    --primary-hover: #1C2745;
    --primary-surface: rgba(16, 24, 48, 0.06);
    --on-primary: #F6F2EA;
    --secondary: #B8862F;
    --danger: #C94A36;
    --shadow: 0 16px 40px -10px rgba(16,24,48,0.14);
}

/* ============ THEME C: Espresso Glass (هايبرد: داكن دافئ أفتح شوية) ============ */
[data-theme="espresso"] {
    --bg: #171212;
    --surface: #221B19;
    --surface-raised: #2C2320;
    --surface-sunken: #110D0C;
    --border: rgba(255, 255, 255, 0.08);
    --border-strong: rgba(255, 255, 255, 0.16);
    --text-primary: #F3ECE6;
    --text-secondary: #C2B2A7;
    --text-tertiary: #8A796E;
    --primary: #4FA392;
    --primary-hover: #63BCA9;
    --primary-surface: rgba(79, 163, 146, 0.14);
    --on-primary: #06211C;
    --secondary: #D6924C;
    --danger: #E0604A;
    --shadow: 0 20px 50px -12px rgba(0,0,0,0.55);
}

body { background: var(--bg); color: var(--text-primary); }

/* ---------- Theme Switcher ---------- */
.switcher {
    position: sticky; top: 0; z-index: 50;
    display: flex; gap: 8px; padding: 14px 20px;
    background: var(--surface); border-bottom: 1px solid var(--border);
    backdrop-filter: blur(16px);
}
.switcher button {
    font-family: 'Cairo', sans-serif;
    border: 1px solid var(--border); background: transparent; color: var(--text-secondary);
    padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 700; cursor: pointer;
    transition: all .2s ease;
}
.switcher button.active { background: var(--primary); color: var(--on-primary); border-color: var(--primary); }
.switcher .hint { margin-inline-start: auto; font-size: 12px; color: var(--text-tertiary); align-self: center; }

.page { max-width: 980px; margin: 0 auto; padding: 28px 20px 80px; }
.section-title { font-size: 13px; font-weight: 800; color: var(--text-tertiary); letter-spacing: .04em; margin: 36px 0 14px; text-transform: uppercase; }
.section-title:first-child { margin-top: 0; }

/* ---------- Mock App Header ---------- */
.app-header {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
    padding: 10px 14px; box-shadow: var(--shadow);
}
.header-group { display: flex; align-items: center; gap: 6px; }
.icon-btn {
    display: flex; align-items: center; gap: 7px;
    background: var(--surface-raised); border: 1px solid var(--border); color: var(--text-secondary);
    padding: 9px 13px; border-radius: 12px; font-size: 12.5px; font-weight: 700; cursor: pointer;
    transition: all .18s ease;
}
.icon-btn:hover { border-color: var(--border-strong); color: var(--text-primary); }
.icon-btn svg { width: 16px; height: 16px; stroke-width: 2; }
.icon-btn.only svg { width: 17px; height: 17px; }
.divider { width: 1px; height: 22px; background: var(--border); margin: 0 2px; }
.pill {
    display: flex; align-items: center; gap: 8px;
    background: var(--surface-raised); border: 1px solid var(--border);
    padding: 8px 14px; border-radius: 12px; font-family: 'JetBrains Mono', monospace;
}
.pill svg { width: 15px; height: 15px; color: var(--primary); }
.pill b { font-size: 13px; }
.avatar {
    width: 34px; height: 34px; border-radius: 50%; background: var(--primary); color: var(--on-primary);
    display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px;
}
.panic-btn {
    display: flex; align-items: center; gap: 7px;
    background: var(--danger); color: #fff; border: none;
    padding: 9px 15px; border-radius: 12px; font-size: 12.5px; font-weight: 800; cursor: pointer;
}
.panic-btn svg { width: 16px; height: 16px; }

/* ---------- Buttons ---------- */
.btn-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.btn {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: 'Cairo', sans-serif; font-weight: 700; font-size: 13.5px;
    padding: 10px 20px; border-radius: 12px; border: 1px solid transparent; cursor: pointer;
}
.btn svg { width: 16px; height: 16px; }
.btn-primary { background: var(--primary); color: var(--on-primary); }
.btn-secondary { background: var(--surface-raised); color: var(--text-primary); border-color: var(--border-strong); }
.btn-ghost { background: transparent; color: var(--text-secondary); }
.btn-danger { background: var(--danger); color: #fff; }

/* ---------- Modal mock ---------- */
.modal-mock {
    background: var(--surface-raised); border: 1px solid var(--border); border-radius: 22px;
    box-shadow: var(--shadow); max-width: 420px; overflow: hidden;
}
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border); }
.modal-head .title { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 15px; }
.modal-head .title svg { width: 19px; height: 19px; color: var(--primary); }
.modal-close {
    width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    background: var(--surface-sunken); color: var(--text-secondary); border: 1px solid var(--border); cursor: pointer;
}
.modal-close svg { width: 15px; height: 15px; }
.modal-body { padding: 18px 20px; font-size: 13.5px; color: var(--text-secondary); line-height: 1.8; }
.modal-body .row { display: flex; align-items: center; gap: 10px; background: var(--surface-sunken); border: 1px solid var(--border); padding: 12px 14px; border-radius: 14px; margin-top: 10px; }
.modal-body .row svg { width: 17px; height: 17px; color: var(--primary); }

/* ---------- Cards ---------- */
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 16px; }
.card .top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.card .top .ic { width: 38px; height: 38px; border-radius: 11px; background: var(--primary-surface); color: var(--primary); display: flex; align-items: center; justify-content: center; }
.card .top .ic svg { width: 19px; height: 19px; }
.card h4 { margin: 0 0 4px; font-size: 14px; }
.card p { margin: 0; font-size: 12.5px; color: var(--text-secondary); line-height: 1.6; }
.card .live { display: inline-flex; align-items: center; gap: 5px; margin-top: 10px; font-size: 11px; color: var(--primary); font-weight: 700; }
.card .live .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); animation: pulse 1.4s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
</style>
</head>
<body data-theme="midnight">

<div class="switcher">
    <button data-t="midnight" class="active">١ — ليلي وبراص (داكن فخم)</button>
    <button data-t="ivory">٢ — عاجي وكحلي (فاتح أنيق)</button>
    <button data-t="espresso">٣ — إسبريسو زجاجي (هايبرد دافئ)</button>
    <span class="hint">كله من غير أي إيموجي — أيقونات حقيقية بس</span>
</div>

<div class="page">

    <div class="section-title">الهيدر — نفس الأزرار، أيقونات بدل الإيموجي</div>
    <div class="app-header">
        <div class="header-group">
            <button class="icon-btn only" title="AirDrop"><i data-lucide="send"></i></button>
            <button class="icon-btn only" title="السبورة"><i data-lucide="pen-tool"></i></button>
            <button class="icon-btn only" title="كشكول الأكواد"><i data-lucide="code-2"></i></button>
            <span class="divider"></span>
            <button class="icon-btn only" title="بث الشاشة"><i data-lucide="monitor-play"></i></button>
            <button class="icon-btn only" title="إذاعة القرآن"><i data-lucide="radio"></i></button>
            <button class="icon-btn only" title="أغاني الفصل"><i data-lucide="music-2"></i></button>
            <button class="icon-btn only" title="السبحة"><i data-lucide="circle-dot-dashed"></i></button>
        </div>
        <div class="header-group">
            <div class="pill"><i data-lucide="clock"></i><b>05:08</b></div>
            <button class="icon-btn only" title="الأدمن"><i data-lucide="crown"></i></button>
            <div class="avatar">ع</div>
            <span class="divider"></span>
            <button class="panic-btn"><i data-lucide="siren"></i>البشمهندسة</button>
        </div>
    </div>

    <div class="section-title">الأزرار</div>
    <div class="btn-row">
        <button class="btn btn-primary"><i data-lucide="check"></i>تأكيد</button>
        <button class="btn btn-secondary"><i data-lucide="arrow-right"></i>رجوع</button>
        <button class="btn btn-ghost"><i data-lucide="settings"></i>إعدادات</button>
        <button class="btn btn-danger"><i data-lucide="trash-2"></i>حذف</button>
    </div>

    <div class="section-title">نموذج مودال موحّد</div>
    <div class="modal-mock">
        <div class="modal-head">
            <div class="title"><i data-lucide="send"></i>مشاركة الملفات — AirDrop</div>
            <div class="modal-close"><i data-lucide="x"></i></div>
        </div>
        <div class="modal-body">
            اسحب أي ملف هنا أو اضغط للاختيار، هيوصل لكل زمايلك في الفصل فورًا.
            <div class="row"><i data-lucide="file-text"></i> ملخص_الفيزياء.pdf</div>
            <div class="row"><i data-lucide="image"></i> سبورة_الحصة.png</div>
        </div>
    </div>

    <div class="section-title">كروت / لوحات</div>
    <div class="cards">
        <div class="card">
            <div class="top"><div class="ic"><i data-lucide="radio"></i></div></div>
            <h4>إذاعة القرآن الكريم</h4>
            <p>بث مباشر من القاهرة لكل الفصل دفعة واحدة.</p>
            <div class="live"><span class="dot"></span> شغالة الآن</div>
        </div>
        <div class="card">
            <div class="top"><div class="ic"><i data-lucide="monitor-play"></i></div></div>
            <h4>بث الشاشة</h4>
            <p>شارك شاشتك أو تابع بث زميلك في الوقت الفعلي.</p>
        </div>
        <div class="card">
            <div class="top"><div class="ic"><i data-lucide="users"></i></div></div>
            <h4>زملاء الفصل</h4>
            <p>24 متصل الآن — شوف مين فاتح معاك دلوقتي.</p>
        </div>
    </div>

</div>

<script>
lucide.createIcons();
document.querySelectorAll('.switcher button[data-t]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.body.setAttribute('data-theme', btn.dataset.t);
        document.querySelectorAll('.switcher button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});
</script>
</body>
</html>

~~~~


### المصدر: docs/design-system-preview.html

~~~~html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>نظام تصميم نؤطة — معاينة بصرية v1.0</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
<style>
    :root {
        --bg-canvas: #0A0F1C;
        --bg-surface: #111827;
        --bg-surface-raised: #161F32;
        --bg-surface-sunken: #070B14;
        --overlay-scrim: rgba(6,9,18,0.72);

        --border-subtle: rgba(255,255,255,0.06);
        --border-default: rgba(255,255,255,0.10);
        --border-strong: rgba(255,255,255,0.18);
        --border-accent: rgba(45,212,191,0.45);

        --text-primary: #F1F5F9;
        --text-secondary: #9AA7BD;
        --text-tertiary: #64748B;
        --text-on-accent: #06141A;

        --primary-300: #5EEAD4;
        --primary-500: #2DD4BF;
        --primary-600: #14B8A6;
        --primary-700: #0F9488;
        --primary-surface: rgba(45,212,191,0.12);

        --secondary-300: #F3D28C;
        --secondary-500: #D4A24C;
        --secondary-600: #B9843A;
        --secondary-surface: rgba(212,162,76,0.14);

        --success-500: #22C55E; --success-surface: rgba(34,197,94,0.12);
        --warning-500: #F59E0B; --warning-surface: rgba(245,158,11,0.12);
        --danger-500: #EF4444;  --danger-surface: rgba(239,68,68,0.12);
        --info-500: #38BDF8;    --info-surface: rgba(56,189,248,0.12);

        --tag-comms: #2DD4BF;
        --tag-collab: #818CF8;
        --tag-media: #F472B6;
        --tag-faith: #D4A24C;
        --tag-broadcast: #38BDF8;
        --tag-admin: #FB923C;

        --radius-xs: 8px; --radius-sm: 10px; --radius-md: 14px;
        --radius-lg: 20px; --radius-xl: 28px; --radius-full: 9999px;

        --shadow-1: 0 1px 2px rgba(0,0,0,.3);
        --shadow-2: 0 4px 12px rgba(0,0,0,.35);
        --shadow-3: 0 12px 32px rgba(0,0,0,.45);
        --shadow-glow: 0 0 0 1px var(--border-accent), 0 4px 20px rgba(45,212,191,.25);

        --ease: cubic-bezier(.4,0,.2,1);
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
        background: var(--bg-canvas);
        color: var(--text-primary);
        font-family: 'Cairo', sans-serif;
        line-height: 1.6;
        padding: 32px 24px 80px;
    }
    .en { font-family: 'Plus Jakarta Sans', sans-serif; }
    .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; direction: ltr; unicode-bidi: isolate; }

    .wrap { max-width: 1100px; margin: 0 auto; }

    /* ---- Page Header ---- */
    .page-head { display: flex; align-items: center; gap: 14px; margin-bottom: 8px; }
    .logo-mark {
        width: 48px; height: 48px; border-radius: var(--radius-md);
        background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
        display: flex; align-items: center; justify-content: center;
        font-weight: 900; color: var(--text-on-accent); font-size: 20px;
        box-shadow: var(--shadow-2);
    }
    h1.title { font-size: 26px; font-weight: 800; margin: 0; }
    .version-pill {
        display: inline-flex; align-items: center; gap: 6px;
        background: var(--primary-surface); color: var(--primary-300);
        border: 1px solid var(--border-accent); border-radius: var(--radius-full);
        padding: 4px 12px; font-size: 12px; font-weight: 700;
    }
    .page-sub { color: var(--text-secondary); font-size: 14px; margin: 6px 0 40px; max-width: 70ch; }

    /* ---- Section scaffolding ---- */
    section { margin-bottom: 56px; }
    .sec-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 18px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px; }
    .sec-num {
        font-family: 'JetBrains Mono', monospace; direction: ltr;
        color: var(--text-tertiary); font-size: 13px; font-weight: 700;
    }
    .sec-head h2 { font-size: 18px; font-weight: 800; margin: 0; }

    /* ---- Color swatches ---- */
    .swatch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
    .swatch {
        border: 1px solid var(--border-default); border-radius: var(--radius-md);
        overflow: hidden; background: var(--bg-surface);
    }
    .swatch-color { height: 64px; }
    .swatch-meta { padding: 10px 12px; }
    .swatch-name { font-size: 12.5px; font-weight: 700; margin: 0 0 2px; }
    .swatch-hex { font-size: 11px; color: var(--text-tertiary); margin: 0; }

    /* ---- Typography samples ---- */
    .type-row { display: flex; align-items: baseline; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--border-subtle); }
    .type-row:last-child { border-bottom: none; }
    .type-label { width: 150px; flex-shrink: 0; font-family: 'JetBrains Mono', monospace; direction: ltr; font-size: 11px; color: var(--text-tertiary); }
    .t-display { font-size: 28px; font-weight: 800; }
    .t-h1 { font-size: 20px; font-weight: 800; }
    .t-h2 { font-size: 16px; font-weight: 700; }
    .t-body-lg { font-size: 15px; font-weight: 600; }
    .t-body { font-size: 13px; font-weight: 400; }
    .t-caption { font-size: 12px; color: var(--text-secondary); }
    .t-micro { font-size: 10.5px; color: var(--text-tertiary); }

    /* ---- Radius / Shadow / Motion demos ---- */
    .demo-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .demo-box {
        width: 96px; height: 96px; background: var(--bg-surface);
        border: 1px solid var(--border-default);
        display: flex; align-items: center; justify-content: center;
        font-size: 11px; color: var(--text-secondary); text-align: center; flex-direction: column; gap: 4px;
    }
    .demo-box span.mono { font-size: 11px; }

    .live-dot {
        width: 9px; height: 9px; border-radius: 50%; background: var(--danger-500);
        box-shadow: 0 0 0 0 rgba(239,68,68,.5);
        animation: pulse-ring 1.6s var(--ease) infinite;
    }
    @keyframes pulse-ring {
        0% { box-shadow: 0 0 0 0 rgba(239,68,68,.5); }
        70% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
    }

    /* ---- Buttons ---- */
    .btn-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .btn {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 10px 18px; border-radius: var(--radius-md);
        font-size: 13px; font-weight: 700; border: 1px solid transparent;
        cursor: pointer; transition: all var(--ease) .15s; font-family: inherit;
    }
    .btn-primary { background: var(--primary-500); color: var(--text-on-accent); }
    .btn-primary:hover { background: var(--primary-600); }
    .btn-secondary { background: var(--bg-surface-raised); color: var(--text-primary); border-color: var(--border-default); }
    .btn-ghost { background: transparent; color: var(--text-secondary); }
    .btn-ghost:hover { background: var(--border-subtle); }
    .btn-danger { background: var(--danger-500); color: #fff; }
    .btn-icon {
        width: 36px; height: 36px; border-radius: var(--radius-full); padding: 0;
        background: var(--bg-surface-raised); border-color: var(--border-default);
        display: inline-flex; align-items: center; justify-content: center; color: var(--text-secondary);
    }

    /* ---- Inputs ---- */
    .field { margin-bottom: 14px; max-width: 360px; }
    .field label { display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; }
    .field input, .field select {
        width: 100%; height: 40px; background: var(--bg-surface-sunken);
        border: 1px solid var(--border-default); border-radius: var(--radius-sm);
        color: var(--text-primary); padding: 0 14px; font-size: 13px; font-family: inherit;
        outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .field input:focus, .field select:focus {
        border-color: var(--primary-500); box-shadow: 0 0 0 3px var(--primary-surface);
    }

    /* ---- Badges ---- */
    .badge-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .badge {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 5px 12px; border-radius: var(--radius-xs); font-size: 11.5px; font-weight: 700;
        border: 1px solid transparent;
    }
    .badge-dot { width: 6px; height: 6px; border-radius: 50%; }
    .badge-success { background: var(--success-surface); color: var(--success-500); }
    .badge-warning { background: var(--warning-surface); color: var(--warning-500); }
    .badge-danger { background: var(--danger-surface); color: var(--danger-500); }
    .badge-info { background: var(--info-surface); color: var(--info-500); }

    /* ---- Modal mockup ---- */
    .modal-stage {
        background: var(--overlay-scrim); border-radius: var(--radius-lg);
        padding: 48px 24px; display: flex; justify-content: center;
    }
    .modal-card {
        width: 100%; max-width: 420px; background: var(--bg-surface-raised);
        border: 1px solid var(--border-default); border-radius: var(--radius-xl);
        box-shadow: var(--shadow-3); overflow: hidden;
    }
    .modal-head {
        display: flex; align-items: center; justify-content: space-between;
        padding: 24px 24px 16px; border-bottom: 1px solid var(--border-subtle);
    }
    .modal-head-title { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 800; }
    .modal-body { padding: 24px; color: var(--text-secondary); font-size: 13px; }
    .modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px 24px; }

    /* ---- Header regroup mockup ---- */
    .header-mock {
        background: var(--bg-surface); border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg); padding: 12px 16px;
        display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    }
    .hm-group { display: flex; align-items: center; gap: 8px; }
    .hm-icon-btn {
        width: 36px; height: 36px; border-radius: var(--radius-sm);
        background: var(--bg-surface-raised); border: 1px solid var(--border-default);
        display: flex; align-items: center; justify-content: center; font-size: 15px; color: var(--text-secondary);
    }
    .hm-pill {
        display: flex; align-items: center; gap: 8px; padding: 6px 12px;
        border-radius: var(--radius-full); background: var(--bg-surface-raised);
        border: 1px solid var(--border-default); font-size: 12px; font-family: 'JetBrains Mono', monospace; direction: ltr;
    }
    .hm-group-label { font-size: 10px; color: var(--text-tertiary); margin-bottom: 6px; font-weight: 700; }

    .before-after { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 720px) { .before-after { grid-template-columns: 1fr; } }
    .ba-card { border-radius: var(--radius-lg); padding: 18px; border: 1px solid var(--border-default); }
    .ba-label { font-size: 11px; font-weight: 800; margin-bottom: 10px; display: inline-block; padding: 3px 10px; border-radius: var(--radius-full); }
    .ba-before { background: #0D0604; }
    .ba-before .ba-label { background: rgba(239,68,68,.15); color: #FCA5A5; }
    .ba-after { background: var(--bg-surface); }
    .ba-after .ba-label { background: var(--primary-surface); color: var(--primary-300); }

    .old-chaos-btn {
        display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 10px;
        font-size: 11px; font-weight: 700; margin: 3px; border: 1px solid;
    }

    footer.note {
        margin-top: 60px; padding-top: 20px; border-top: 1px solid var(--border-subtle);
        color: var(--text-tertiary); font-size: 12px;
    }
</style>
</head>
<body>
<div class="wrap">

    <div class="page-head">
        <div class="logo-mark">نـ</div>
        <h1 class="title">نظام تصميم نؤطة</h1>
        <span class="version-pill">● v1.0 — مُقترَح للموافقة</span>
    </div>
    <p class="page-sub">معاينة بصرية حية لكل قيم وتوكينز نظام التصميم الموصوف في <span class="mono">docs/DESIGN_SYSTEM.md</span>. هذه الصفحة ليست جزء من التطبيق الفعلي — هي مرجع للمراجعة والموافقة فقط.</p>

    <!-- 1. Colors -->
    <section>
        <div class="sec-head"><span class="sec-num">§1</span><h2>الألوان — الخلفيات والحدود والنصوص</h2></div>
        <div class="swatch-grid">
            <div class="swatch"><div class="swatch-color" style="background:var(--bg-canvas)"></div><div class="swatch-meta"><p class="swatch-name">bg-canvas</p><p class="swatch-hex mono">#0A0F1C</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--bg-surface)"></div><div class="swatch-meta"><p class="swatch-name">bg-surface</p><p class="swatch-hex mono">#111827</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--bg-surface-raised)"></div><div class="swatch-meta"><p class="swatch-name">bg-surface-raised</p><p class="swatch-hex mono">#161F32</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--bg-surface-sunken)"></div><div class="swatch-meta"><p class="swatch-name">bg-surface-sunken</p><p class="swatch-hex mono">#070B14</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--text-primary)"></div><div class="swatch-meta"><p class="swatch-name" style="color:#000">text-primary</p><p class="swatch-hex mono" style="color:#333">#F1F5F9</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--text-secondary)"></div><div class="swatch-meta"><p class="swatch-name">text-secondary</p><p class="swatch-hex mono">#9AA7BD</p></div></div>
        </div>
    </section>

    <section>
        <div class="sec-head"><span class="sec-num">§1.4-1.5</span><h2>الأساسي (Primary) والثانوي (Secondary)</h2></div>
        <div class="swatch-grid">
            <div class="swatch"><div class="swatch-color" style="background:var(--primary-500)"></div><div class="swatch-meta"><p class="swatch-name">primary-500 ⭐ الأساسي</p><p class="swatch-hex mono">#2DD4BF</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--primary-600)"></div><div class="swatch-meta"><p class="swatch-name">primary-600 (hover)</p><p class="swatch-hex mono">#14B8A6</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--primary-700)"></div><div class="swatch-meta"><p class="swatch-name">primary-700 (active)</p><p class="swatch-hex mono">#0F9488</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--secondary-500)"></div><div class="swatch-meta"><p class="swatch-name">secondary-500 🔥🕌📿</p><p class="swatch-hex mono">#D4A24C</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--secondary-600)"></div><div class="swatch-meta"><p class="swatch-name">secondary-600 (hover)</p><p class="swatch-hex mono">#B9843A</p></div></div>
        </div>
    </section>

    <section>
        <div class="sec-head"><span class="sec-num">§1.6</span><h2>الألوان الدلالية (معنى ثابت دايمًا)</h2></div>
        <div class="swatch-grid">
            <div class="swatch"><div class="swatch-color" style="background:var(--success-500)"></div><div class="swatch-meta"><p class="swatch-name">success — نجاح/متصل</p><p class="swatch-hex mono">#22C55E</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--warning-500)"></div><div class="swatch-meta"><p class="swatch-name">warning — تحذير</p><p class="swatch-hex mono">#F59E0B</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--danger-500)"></div><div class="swatch-meta"><p class="swatch-name">danger — خطر/حذف</p><p class="swatch-hex mono">#EF4444</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--info-500)"></div><div class="swatch-meta"><p class="swatch-name">info — معلومة</p><p class="swatch-hex mono">#38BDF8</p></div></div>
        </div>
    </section>

    <section>
        <div class="sec-head"><span class="sec-num">§1.7</span><h2>ألوان تصنيف الأدوات (Feature Tags)</h2></div>
        <div class="swatch-grid">
            <div class="swatch"><div class="swatch-color" style="background:var(--tag-comms)"></div><div class="swatch-meta"><p class="swatch-name">comms — الشات والإذاعة</p><p class="swatch-hex mono">#2DD4BF</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--tag-collab)"></div><div class="swatch-meta"><p class="swatch-name">collab — السبورة والكود</p><p class="swatch-hex mono">#818CF8</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--tag-media)"></div><div class="swatch-meta"><p class="swatch-name">media — استوري وموسيقى</p><p class="swatch-hex mono">#F472B6</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--tag-faith)"></div><div class="swatch-meta"><p class="swatch-name">faith — صلاة وتسبيح</p><p class="swatch-hex mono">#D4A24C</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--tag-broadcast)"></div><div class="swatch-meta"><p class="swatch-name">broadcast — بث وراديو</p><p class="swatch-hex mono">#38BDF8</p></div></div>
            <div class="swatch"><div class="swatch-color" style="background:var(--tag-admin)"></div><div class="swatch-meta"><p class="swatch-name">admin — أدوات الأدمن</p><p class="swatch-hex mono">#FB923C</p></div></div>
        </div>
    </section>

    <!-- 2. Typography -->
    <section>
        <div class="sec-head"><span class="sec-num">§2</span><h2>السلّم النوعي (Typography Scale)</h2></div>
        <div>
            <div class="type-row"><span class="type-label">display / 28px</span><span class="t-display">دخول منصة نؤطة 🚀</span></div>
            <div class="type-row"><span class="type-label">h1 / 20px</span><span class="t-h1">لوحة تحكم الأدمن</span></div>
            <div class="type-row"><span class="type-label">h2 / 16px</span><span class="t-h2">الأجهزة المتصلة بالفصل</span></div>
            <div class="type-row"><span class="type-label">body-lg / 15px</span><span class="t-body-lg">أحمد (كبير الفصل)</span></div>
            <div class="type-row"><span class="type-label">body / 13px</span><span class="t-body">متاح لجميع الزملاء في الفصل</span></div>
            <div class="type-row"><span class="type-label">caption / 12px</span><span class="t-caption">آخر ظهور منذ 3 دقائق</span></div>
            <div class="type-row"><span class="type-label">micro / 10.5px (حد أدنى)</span><span class="t-micro mono">14:52:09</span></div>
        </div>
    </section>

    <!-- 3. Radius / Shadow / Motion -->
    <section>
        <div class="sec-head"><span class="sec-num">§3-4</span><h2>الانحناءات، الظلال، والحركة</h2></div>
        <div class="demo-row" style="margin-bottom:20px;">
            <div class="demo-box" style="border-radius:var(--radius-xs)"><span>xs</span><span class="mono">8px</span></div>
            <div class="demo-box" style="border-radius:var(--radius-sm)"><span>sm</span><span class="mono">10px</span></div>
            <div class="demo-box" style="border-radius:var(--radius-md)"><span>md</span><span class="mono">14px</span></div>
            <div class="demo-box" style="border-radius:var(--radius-lg)"><span>lg</span><span class="mono">20px</span></div>
            <div class="demo-box" style="border-radius:var(--radius-xl)"><span>xl (Modal)</span><span class="mono">28px</span></div>
        </div>
        <div class="demo-row" style="margin-bottom:20px;">
            <div class="demo-box" style="box-shadow:var(--shadow-1)"><span>shadow-1</span></div>
            <div class="demo-box" style="box-shadow:var(--shadow-2)"><span>shadow-2</span></div>
            <div class="demo-box" style="box-shadow:var(--shadow-3)"><span>shadow-3</span></div>
            <div class="demo-box" style="box-shadow:var(--shadow-glow)"><span>live glow</span><div class="live-dot" style="margin-top:4px"></div></div>
        </div>
        <p class="t-caption">النقطة الحمراء النابضة هي الاستخدام الوحيد المسموح لـ pulse/ping — مؤشر "بث حي الآن" فقط، مش تزيين لأي زرار عادي.</p>
    </section>

    <!-- 5. Buttons -->
    <section>
        <div class="sec-head"><span class="sec-num">§7.1</span><h2>الأزرار</h2></div>
        <div class="btn-row">
            <button class="btn btn-primary">إرسال 🚀</button>
            <button class="btn btn-secondary">إلغاء</button>
            <button class="btn btn-ghost">تجاهل</button>
            <button class="btn btn-danger">حذف الرسالة</button>
            <button class="btn btn-icon" aria-label="إغلاق">✕</button>
        </div>
    </section>

    <!-- 6. Inputs -->
    <section>
        <div class="sec-head"><span class="sec-num">§7.3</span><h2>حقول الإدخال</h2></div>
        <div class="field">
            <label>اسم الشهرة أو اللقب</label>
            <input type="text" placeholder="مثال: الباشمهندس أحمد" value="دحيح الفيزيا">
        </div>
        <div class="field">
            <label>عنوان IP سيرفر الأدمن (محتوى LTR داخل RTL)</label>
            <input type="text" class="mono" value="192.168.20.54" dir="ltr">
        </div>
    </section>

    <!-- 7. Badges -->
    <section>
        <div class="sec-head"><span class="sec-num">§7.4</span><h2>البادچ (Status vs Tag)</h2></div>
        <p class="t-caption" style="margin-bottom:10px;">دلالية (معنى ثابت):</p>
        <div class="badge-row" style="margin-bottom:18px;">
            <span class="badge badge-success"><span class="badge-dot" style="background:var(--success-500)"></span> متصل الآن</span>
            <span class="badge badge-warning"><span class="badge-dot" style="background:var(--warning-500)"></span> وضع التركيز مفعّل</span>
            <span class="badge badge-danger"><span class="badge-dot" style="background:var(--danger-500)"></span> تم الحذف</span>
            <span class="badge badge-info"><span class="badge-dot" style="background:var(--info-500)"></span> تحديث جديد</span>
        </div>
        <p class="t-caption" style="margin-bottom:10px;">تصنيف أداة:</p>
        <div class="badge-row">
            <span class="badge" style="background:rgba(45,212,191,.12); color:var(--tag-comms)"><span class="badge-dot" style="background:var(--tag-comms)"></span> شات</span>
            <span class="badge" style="background:rgba(129,140,248,.12); color:var(--tag-collab)"><span class="badge-dot" style="background:var(--tag-collab)"></span> سبورة</span>
            <span class="badge" style="background:rgba(244,114,182,.12); color:var(--tag-media)"><span class="badge-dot" style="background:var(--tag-media)"></span> استوري</span>
            <span class="badge" style="background:rgba(212,162,76,.14); color:var(--tag-faith)"><span class="badge-dot" style="background:var(--tag-faith)"></span> تسبيح</span>
        </div>
    </section>

    <!-- 8. Modal -->
    <section>
        <div class="sec-head"><span class="sec-num">§7.2</span><h2>القالب الموحّد للمودالز</h2></div>
        <div class="modal-stage">
            <div class="modal-card">
                <div class="modal-head">
                    <div class="modal-head-title"><span>⚡</span><span>Classroom AirDrop</span></div>
                    <button class="btn btn-icon">✕</button>
                </div>
                <div class="modal-body">
                    اضغط هنا أو اسحب أي ملف لمشاركته فوراً مع الفصل — نفس القالب (هيدر + محتوى + فوتر) يتكرر في كل مودال بالتطبيق بدل 20+ شكل مختلف حاليًا.
                </div>
                <div class="modal-foot">
                    <button class="btn btn-secondary">إلغاء</button>
                    <button class="btn btn-primary">رفع الملف</button>
                </div>
            </div>
        </div>
    </section>

    <!-- 9. Header regroup -->
    <section>
        <div class="sec-head"><span class="sec-num">§7.5</span><h2>إعادة تنظيم الهيدر (3 مجموعات بدل صف طويل)</h2></div>
        <div class="header-mock">
            <div>
                <div class="hm-group-label">أدوات الفصل</div>
                <div class="hm-group">
                    <div class="hm-icon-btn">⚡</div>
                    <div class="hm-icon-btn">🎨</div>
                    <div class="hm-icon-btn">💻</div>
                    <div class="hm-icon-btn">🖥️</div>
                    <div class="hm-icon-btn">⋯</div>
                </div>
            </div>
            <div>
                <div class="hm-group-label" style="text-align:center">الوقت</div>
                <div class="hm-pill">🕒 14:52:09</div>
            </div>
            <div>
                <div class="hm-group-label" style="text-align:left">حسابي والأدمن</div>
                <div class="hm-group">
                    <div class="hm-icon-btn" style="color:var(--secondary-500)">👑</div>
                    <div class="hm-icon-btn" style="background:var(--bg-surface-raised)">🚀</div>
                    <button class="btn btn-danger" style="padding:8px 14px;">🚨 البشمهندسة</button>
                </div>
            </div>
        </div>
        <p class="t-caption" style="margin-top:12px;">زر البشمهندسة يبقى دايمًا آخر عنصر منفرد لأنه الأهم أمنيًا — لا يتزاحم مع باقي الأدوات.</p>
    </section>

    <!-- 10. Before / After -->
    <section>
        <div class="sec-head"><span class="sec-num">—</span><h2>قبل / بعد (مثال واقعي من الكود الحالي)</h2></div>
        <div class="before-after">
            <div class="ba-card ba-before">
                <span class="ba-label">قبل (حالي)</span>
                <div>
                    <span class="old-chaos-btn" style="background:rgba(6,182,212,.1); border-color:rgba(6,182,212,.3); color:#22d3ee;">⚡ AirDrop</span>
                    <span class="old-chaos-btn" style="background:rgba(168,85,247,.1); border-color:rgba(168,85,247,.3); color:#d8b4fe;">🎨 السبورة</span>
                    <span class="old-chaos-btn" style="background:rgba(99,102,241,.1); border-color:rgba(99,102,241,.3); color:#a5b4fc;">💻 كشكول الأكواد</span>
                    <span class="old-chaos-btn" style="background:rgba(236,72,153,.1); border-color:rgba(236,72,153,.3); color:#f9a8d4;">🎵📻 أغاني الفصل</span>
                    <span class="old-chaos-btn" style="background:rgba(245,158,11,.1); border-color:rgba(245,158,11,.3); color:#fcd34d;">📿 السبحة</span>
                </div>
                <p class="t-caption" style="margin-top:10px;">6 ألوان مختلفة بدون نظام، كل واحد لوحده.</p>
            </div>
            <div class="ba-card ba-after">
                <span class="ba-label">بعد (مُقترَح)</span>
                <div class="hm-group">
                    <div class="hm-icon-btn">⚡</div>
                    <div class="hm-icon-btn">🎨</div>
                    <div class="hm-icon-btn">💻</div>
                    <div class="hm-icon-btn">🎵</div>
                    <div class="hm-icon-btn">📿</div>
                </div>
                <p class="t-caption" style="margin-top:10px;">خلفية موحّدة واحدة، أيقونة فقط بدون نص مكرر، نظام واحد للعين تقرأه بسرعة.</p>
            </div>
        </div>
    </section>

    <footer class="note">
        هذه الصفحة جزء من <span class="mono">docs/</span> في المشروع وليست مرتبطة بالتطبيق الفعلي — راجع <span class="mono">docs/DESIGN_SYSTEM.md</span> للتفاصيل الكاملة و<span class="mono">public/css/design-tokens.css</span> للقيم الجاهزة للتنفيذ.
    </footer>

</div>
</body>
</html>

~~~~


### المصدر: Fix_Firewall.bat

~~~~bat
@echo off
chcp 65001 >nul
title السماح لـ No2ta في جدار حماية ويندوز
color 0A

echo =========================================================================
echo  ⚡ جاري فتح المنفذ 5000 في جدار الحماية (Windows Firewall) ⚡
echo =========================================================================
echo.

netsh advfirewall firewall add rule name="No2ta Classroom Server" dir=in action=allow protocol=TCP localport=5000

if %errorlevel% equ 0 (
    echo.
    echo  [OK] تم فتح المنفذ بنجاح تام!
    echo  الآن يمكن لجميع أجهزة وموبايلات الفصل الدخول إلى السيرفر الخاص بك.
) else (
    echo.
    echo  [!] يتطلب صلاحيات الأدمن:
    echo      اضغط كليك يمين على هذا الملف واشغل: "Run as administrator"
)

echo.
echo =========================================================================
pause

~~~~


### المصدر: install-student-agent.bat

~~~~bat
@echo off
title No2ta NetSupport Student Agent Installer
color 0b
echo ========================================================
echo   [No2ta] NetSupport Student Silent Agent Installer
echo ========================================================
echo.

echo [*] Searching the local network for the teacher's No2ta server...
set "SERVER_URL="
for /f "usebackq delims=" %%A in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $u = New-Object System.Net.Sockets.UdpClient(5055); $u.Client.ReceiveTimeout = 3000; $e = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0); $b = $u.Receive([ref]$e); $u.Close(); $j = [System.Text.Encoding]::UTF8.GetString($b) | ConvertFrom-Json; if ($j.app -eq 'no2ta' -and $j.hostIp) { $url = \"http://$($j.hostIp):$($j.port)\"; Set-Content -Path \"$env:TEMP\no2ta_last_host.txt\" -Value $url -Force; Write-Output $url } elseif (Test-Path \"$env:TEMP\no2ta_last_host.txt\") { (Get-Content \"$env:TEMP\no2ta_last_host.txt\" -Raw).Trim() } } catch { if (Test-Path \"$env:TEMP\no2ta_last_host.txt\") { (Get-Content \"$env:TEMP\no2ta_last_host.txt\" -Raw).Trim() } }"`) do set "SERVER_URL=%%A"
if "%SERVER_URL%"=="" (
    echo [X] Could not find the teacher's server on the network. Make sure it's running and try again.
    pause
    exit /b
)
echo [+] Found server: %SERVER_URL%
set "TARGET_DIR=%APPDATA%\No2taAgent"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

REM 1. Copy or download lab-agent.ps1
if exist "%~dp0lab-agent.ps1" (
    echo [*] Copying lab-agent.ps1 from local directory...
    copy /Y "%~dp0lab-agent.ps1" "%TARGET_DIR%\lab-agent.ps1" >nul
) else (
    echo [*] Downloading lab-agent.ps1 from Teacher Server (%SERVER_URL%)...
    powershell -ExecutionPolicy Bypass -NoProfile -Command "(New-Object Net.WebClient).DownloadFile('%SERVER_URL%/agent/lab-agent.ps1', '%TARGET_DIR%\lab-agent.ps1')"
)

REM 2. Create run-agent-hidden.vbs directly inside TARGET_DIR
echo [*] Setting up hidden background runner...
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File ""%TARGET_DIR%\lab-agent.ps1""", 0, False
) > "%TARGET_DIR%\run-agent-hidden.vbs"

REM 3. Register in Windows Startup folder for automatic monitoring on PC boot
echo [*] Adding to Windows Startup folder...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
copy /Y "%TARGET_DIR%\run-agent-hidden.vbs" "%STARTUP_DIR%\No2taLabAgent.vbs" >nul

REM 4. Kill any previous instance and start fresh silent background agent
powershell -ExecutionPolicy Bypass -NoProfile -Command "Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*lab-agent.ps1*' } | Stop-Process -Force -ErrorAction SilentlyContinue" >nul 2>&1
wscript.exe "%TARGET_DIR%\run-agent-hidden.vbs"

echo.
echo ========================================================
echo   [SUCCESS] Lab Agent installed and running silently!
echo   Full Windows desktop is now streaming to the teacher.
echo ========================================================
echo.
timeout /t 3 >nul
exit

~~~~


### المصدر: lab-agent.bat

~~~~bat
@echo off
title No2ta NetSupport Lab Screen Agent
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0lab-agent.ps1" %*
pause

~~~~


### المصدر: lab-agent.ps1

~~~~ps1
param (
    [string]$ServerUrl = ""
)

# No2ta NetSupport Windows Classroom Screen Agent
# Captures full Windows desktop and sends frames to teacher host

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Auto-discover the teacher's server on the LAN instead of relying on a
# hardcoded IP (which breaks the moment the teacher's DHCP lease changes).
# Falls back to the last known-good host, cached in %TEMP%.
function Find-No2taServer {
    $cacheFile = Join-Path $env:TEMP 'no2ta_last_host.txt'
    try {
        $udp = New-Object System.Net.Sockets.UdpClient(5055)
        $udp.Client.ReceiveTimeout = 3000
        $remote = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0)
        $bytes = $udp.Receive([ref]$remote)
        $udp.Close()
        $json = [System.Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json
        if ($json.app -eq 'no2ta' -and $json.hostIp) {
            $url = "http://$($json.hostIp):$($json.port)"
            Set-Content -Path $cacheFile -Value $url -Force -Encoding UTF8
            return $url
        }
    } catch { }
    if (Test-Path $cacheFile) { return (Get-Content $cacheFile -Raw).Trim() }
    return $null
}

if (-not $ServerUrl) {
    $discovered = Find-No2taServer
    $ServerUrl = if ($discovered) { $discovered } else { "http://192.168.20.54:5000" }
}

$hostname = $env:COMPUTERNAME
$username = $env:USERNAME
$nickname = "$hostname ($username)"

# Get local IP
$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'vEthernet|Loopback|VMware' -and $_.IPAddress -like '192.168.*' } | Select-Object -First 1).IPAddress
if (-not $localIp) {
    $localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress
}
if (-not $localIp) { $localIp = "127.0.0.1" }

# Get MAC Address
$mac = (Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1).MacAddress

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [No2ta NetSupport] Windows Lab Screen Agent is Running!" -ForegroundColor Green
Write-Host " Computer Name: $nickname" -ForegroundColor Yellow
Write-Host " Local IP:      $localIp" -ForegroundColor Yellow
Write-Host " Server URL:    $ServerUrl" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$endpoint = "$ServerUrl/api/netsupport/frame"
$consecutiveFailures = 0

# Quality settings for smooth LAN streaming
$jpegQuality = 55L
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatDescription -eq "JPEG" }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $jpegQuality)

while ($true) {
    try {
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)

        # Scale down to 960x540 for lightweight network traffic
        $scaledWidth = 960
        $scaledHeight = [int]($screen.Height * ($scaledWidth / $screen.Width))
        $scaledBitmap = New-Object System.Drawing.Bitmap($scaledWidth, $scaledHeight)
        $scaledGraphics = [System.Drawing.Graphics]::FromImage($scaledBitmap)
        $scaledGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::Bilinear
        $scaledGraphics.DrawImage($bitmap, 0, 0, $scaledWidth, $scaledHeight)

        $ms = New-Object System.IO.MemoryStream
        $scaledBitmap.Save($ms, $encoder, $encoderParams)
        $bytes = $ms.ToArray()
        $base64 = "data:image/jpeg;base64," + [Convert]::ToBase64String($bytes)

        # Dispose resources
        $ms.Dispose()
        $scaledGraphics.Dispose()
        $scaledBitmap.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()

        # Send to No2ta NetSupport Server
        $safeIpDevId = "dev_" + $localIp.Replace(".", "_")
        $payload = @{
            deviceId     = $safeIpDevId
            computerName = $hostname
            nickname     = $nickname
            ip           = $localIp
            mac          = $mac
            avatar       = "PC"
            role         = "student"
            currentApp   = "Windows Desktop"
            frameBase64  = $base64
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 3 -ErrorAction Stop
        $consecutiveFailures = 0

        if ($response -and $response.isLocked) {
            Write-Host "[LOCKED] Screen is locked by Teacher!" -ForegroundColor Red
        }
    }
    catch {
        # Server unreachable — could just be asleep, or the teacher's IP changed.
        # After ~15s of failures, try to re-discover the server on the LAN.
        $consecutiveFailures++
        if ($consecutiveFailures -ge 10) {
            $consecutiveFailures = 0
            $rediscovered = Find-No2taServer
            if ($rediscovered -and $rediscovered -ne $ServerUrl) {
                $ServerUrl = $rediscovered
                $endpoint = "$ServerUrl/api/netsupport/frame"
                Write-Host "[RECONNECT] Teacher server moved, now using: $ServerUrl" -ForegroundColor Cyan
            }
        }
    }

    Start-Sleep -Milliseconds 1500
}

~~~~


### المصدر: package.json

~~~~json
{
  "name": "no2ta",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "cors": "^2.8.6",
    "crypto-js": "^4.2.0",
    "express": "^5.3.0",
    "multer": "^2.5.0",
    "qrcode": "^1.5.4",
    "socket.io": "^4.8.4",
    "sqlite3": "^6.0.1"
  }
}

~~~~


### المصدر: public/agent/install-student-agent.bat

~~~~bat
@echo off
title No2ta NetSupport Student Agent Installer
color 0b
echo ========================================================
echo   [No2ta] NetSupport Student Silent Agent Installer
echo ========================================================
echo.

echo [*] Searching the local network for the teacher's No2ta server...
set "SERVER_URL="
for /f "usebackq delims=" %%A in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $u = New-Object System.Net.Sockets.UdpClient(5055); $u.Client.ReceiveTimeout = 3000; $e = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0); $b = $u.Receive([ref]$e); $u.Close(); $j = [System.Text.Encoding]::UTF8.GetString($b) | ConvertFrom-Json; if ($j.app -eq 'no2ta' -and $j.hostIp) { $url = \"http://$($j.hostIp):$($j.port)\"; Set-Content -Path \"$env:TEMP\no2ta_last_host.txt\" -Value $url -Force; Write-Output $url } elseif (Test-Path \"$env:TEMP\no2ta_last_host.txt\") { (Get-Content \"$env:TEMP\no2ta_last_host.txt\" -Raw).Trim() } } catch { if (Test-Path \"$env:TEMP\no2ta_last_host.txt\") { (Get-Content \"$env:TEMP\no2ta_last_host.txt\" -Raw).Trim() } }"`) do set "SERVER_URL=%%A"
if "%SERVER_URL%"=="" (
    echo [X] Could not find the teacher's server on the network. Make sure it's running and try again.
    pause
    exit /b
)
echo [+] Found server: %SERVER_URL%
set "TARGET_DIR=%APPDATA%\No2taAgent"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

REM 1. Copy or download lab-agent.ps1
if exist "%~dp0lab-agent.ps1" (
    echo [*] Copying lab-agent.ps1 from local directory...
    copy /Y "%~dp0lab-agent.ps1" "%TARGET_DIR%\lab-agent.ps1" >nul
) else (
    echo [*] Downloading lab-agent.ps1 from Teacher Server (%SERVER_URL%)...
    powershell -ExecutionPolicy Bypass -NoProfile -Command "(New-Object Net.WebClient).DownloadFile('%SERVER_URL%/agent/lab-agent.ps1', '%TARGET_DIR%\lab-agent.ps1')"
)

REM 2. Create run-agent-hidden.vbs directly inside TARGET_DIR
echo [*] Setting up hidden background runner...
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File ""%TARGET_DIR%\lab-agent.ps1""", 0, False
) > "%TARGET_DIR%\run-agent-hidden.vbs"

REM 3. Register in Windows Startup folder for automatic monitoring on PC boot
echo [*] Adding to Windows Startup folder...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
copy /Y "%TARGET_DIR%\run-agent-hidden.vbs" "%STARTUP_DIR%\No2taLabAgent.vbs" >nul

REM 4. Kill any previous instance and start fresh silent background agent
powershell -ExecutionPolicy Bypass -NoProfile -Command "Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*lab-agent.ps1*' } | Stop-Process -Force -ErrorAction SilentlyContinue" >nul 2>&1
wscript.exe "%TARGET_DIR%\run-agent-hidden.vbs"

echo.
echo ========================================================
echo   [SUCCESS] Lab Agent installed and running silently!
echo   Full Windows desktop is now streaming to the teacher.
echo ========================================================
echo.
timeout /t 3 >nul
exit

~~~~


### المصدر: public/agent/lab-agent.bat

~~~~bat
@echo off
title No2ta NetSupport Lab Screen Agent
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0lab-agent.ps1" %*
pause

~~~~


### المصدر: public/agent/lab-agent.ps1

~~~~ps1
param (
    [string]$ServerUrl = ""
)

# No2ta NetSupport Windows Classroom Screen Agent
# Captures full Windows desktop and sends frames to teacher host

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Auto-discover the teacher's server on the LAN instead of relying on a
# hardcoded IP (which breaks the moment the teacher's DHCP lease changes).
# Falls back to the last known-good host, cached in %TEMP%.
function Find-No2taServer {
    $cacheFile = Join-Path $env:TEMP 'no2ta_last_host.txt'
    try {
        $udp = New-Object System.Net.Sockets.UdpClient(5055)
        $udp.Client.ReceiveTimeout = 3000
        $remote = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0)
        $bytes = $udp.Receive([ref]$remote)
        $udp.Close()
        $json = [System.Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json
        if ($json.app -eq 'no2ta' -and $json.hostIp) {
            $url = "http://$($json.hostIp):$($json.port)"
            Set-Content -Path $cacheFile -Value $url -Force -Encoding UTF8
            return $url
        }
    } catch { }
    if (Test-Path $cacheFile) { return (Get-Content $cacheFile -Raw).Trim() }
    return $null
}

if (-not $ServerUrl) {
    $discovered = Find-No2taServer
    $ServerUrl = if ($discovered) { $discovered } else { "http://192.168.20.54:5000" }
}

$hostname = $env:COMPUTERNAME
$username = $env:USERNAME
$nickname = "$hostname ($username)"

# Get local IP
$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'vEthernet|Loopback|VMware' -and $_.IPAddress -like '192.168.*' } | Select-Object -First 1).IPAddress
if (-not $localIp) {
    $localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress
}
if (-not $localIp) { $localIp = "127.0.0.1" }

# Get MAC Address
$mac = (Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1).MacAddress

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [No2ta NetSupport] Windows Lab Screen Agent is Running!" -ForegroundColor Green
Write-Host " Computer Name: $nickname" -ForegroundColor Yellow
Write-Host " Local IP:      $localIp" -ForegroundColor Yellow
Write-Host " Server URL:    $ServerUrl" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$endpoint = "$ServerUrl/api/netsupport/frame"
$consecutiveFailures = 0

# Quality settings for smooth LAN streaming
$jpegQuality = 55L
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatDescription -eq "JPEG" }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $jpegQuality)

while ($true) {
    try {
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)

        # Scale down to 960x540 for lightweight network traffic
        $scaledWidth = 960
        $scaledHeight = [int]($screen.Height * ($scaledWidth / $screen.Width))
        $scaledBitmap = New-Object System.Drawing.Bitmap($scaledWidth, $scaledHeight)
        $scaledGraphics = [System.Drawing.Graphics]::FromImage($scaledBitmap)
        $scaledGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::Bilinear
        $scaledGraphics.DrawImage($bitmap, 0, 0, $scaledWidth, $scaledHeight)

        $ms = New-Object System.IO.MemoryStream
        $scaledBitmap.Save($ms, $encoder, $encoderParams)
        $bytes = $ms.ToArray()
        $base64 = "data:image/jpeg;base64," + [Convert]::ToBase64String($bytes)

        # Dispose resources
        $ms.Dispose()
        $scaledGraphics.Dispose()
        $scaledBitmap.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()

        # Send to No2ta NetSupport Server
        $safeIpDevId = "dev_" + $localIp.Replace(".", "_")
        $payload = @{
            deviceId     = $safeIpDevId
            computerName = $hostname
            nickname     = $nickname
            ip           = $localIp
            mac          = $mac
            avatar       = "PC"
            role         = "student"
            currentApp   = "Windows Desktop"
            frameBase64  = $base64
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 3 -ErrorAction Stop
        $consecutiveFailures = 0

        if ($response -and $response.isLocked) {
            Write-Host "[LOCKED] Screen is locked by Teacher!" -ForegroundColor Red
        }
    }
    catch {
        # Server unreachable — could just be asleep, or the teacher's IP changed.
        # After ~15s of failures, try to re-discover the server on the LAN.
        $consecutiveFailures++
        if ($consecutiveFailures -ge 10) {
            $consecutiveFailures = 0
            $rediscovered = Find-No2taServer
            if ($rediscovered -and $rediscovered -ne $ServerUrl) {
                $ServerUrl = $rediscovered
                $endpoint = "$ServerUrl/api/netsupport/frame"
                Write-Host "[RECONNECT] Teacher server moved, now using: $ServerUrl" -ForegroundColor Cyan
            }
        }
    }

    Start-Sleep -Milliseconds 1500
}

~~~~


### المصدر: public/agent/run-agent-hidden.vbs

~~~~vbs
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDataDir = WshShell.ExpandEnvironmentStrings("%APPDATA%") & "\No2taAgent\lab-agent.ps1"
currentDir = fso.GetParentFolderName(WScript.ScriptFullName) & "\lab-agent.ps1"

ps1Path = currentDir
If fso.FileExists(appDataDir) Then
    ps1Path = appDataDir
End If

WshShell.Run "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File """ & ps1Path & """", 0, False

~~~~


### المصدر: public/css/design-tokens.css

~~~~css
/* ==========================================================================
   No2ta Design System — Tokens (v1.1 — "Midnight & Brass")
   المصدر الوحيد لقيم الألوان/الخطوط/المسافات/الظلال في المنصة.
   راجع docs/DESIGN_SYSTEM.md للشرح الكامل وقواعد الاستخدام.

   v1.1: استبدال اتجاه "Ink Blue + Teal" بـ"ليلي وبراص" (Midnight & Brass) —
   خلفيات غرافيت دافئة شبه سوداء + ذهبي/براص كلون أساسي واحد، بعد مراجعة
   المستخدم للاتجاهات الثلاثة في docs/design-direction-preview-v2.html
   واختياره الاتجاه الأول. كل الإيموجي استُبدل بأيقونات Lucide (راجع §5).
   ========================================================================== */

:root {
    /* ---------- 1.1 Surfaces ---------- */
    --no2ta-bg-canvas: #0B0A09;
    --no2ta-bg-surface: #161310;
    --no2ta-bg-surface-raised: #1F1A15;
    --no2ta-bg-surface-sunken: #060504;
    --no2ta-bg-overlay-scrim: rgba(5, 4, 3, 0.78);

    /* ---------- 1.2 Borders (ذهبية خفيفة بدل الأبيض الشفاف) ---------- */
    --no2ta-border-subtle: rgba(214, 178, 110, 0.08);
    --no2ta-border-default: rgba(214, 178, 110, 0.16);
    --no2ta-border-strong: rgba(214, 178, 110, 0.32);
    --no2ta-border-accent: rgba(214, 178, 110, 0.5);

    /* ---------- 1.3 Text ---------- */
    --no2ta-text-primary: #F5EFE4;
    --no2ta-text-secondary: #B8AC97;
    --no2ta-text-tertiary: #7C7363;
    --no2ta-text-disabled: rgba(124, 115, 99, 0.5);
    --no2ta-text-on-accent: #1A1308;

    /* ---------- 1.4 Primary — Brass Gold ---------- */
    --no2ta-primary-50: #FBF3E3;
    --no2ta-primary-300: #E8C988;
    --no2ta-primary-500: #D6B26E;
    --no2ta-primary-600: #C49A4E;
    --no2ta-primary-700: #A67E39;
    --no2ta-primary-surface: rgba(214, 178, 110, 0.12);

    /* ---------- 1.5 Secondary — Muted Sage ---------- */
    --no2ta-secondary-300: #AAB8A0;
    --no2ta-secondary-500: #8A9A8C;
    --no2ta-secondary-600: #71806F;
    --no2ta-secondary-surface: rgba(138, 154, 140, 0.14);

    /* ---------- 1.6 Semantic ---------- */
    --no2ta-success-500: #7FAE63;
    --no2ta-success-surface: rgba(127, 174, 99, 0.14);
    --no2ta-warning-500: #E08A3C;
    --no2ta-warning-surface: rgba(224, 138, 60, 0.14);
    --no2ta-danger-500: #E0604A;
    --no2ta-danger-surface: rgba(224, 96, 74, 0.14);
    --no2ta-info-500: #6FA8C9;
    --no2ta-info-surface: rgba(111, 168, 201, 0.14);

    /* ---------- 1.7 Feature Tags ---------- */
    --no2ta-tag-comms: #D6B26E;
    --no2ta-tag-collab: #7C8FBD;
    --no2ta-tag-media: #C98BA0;
    --no2ta-tag-faith: #B5693F;
    --no2ta-tag-broadcast: #6E8CA6;
    --no2ta-tag-admin: #CC7A3D;

    /* ---------- 2. Typography ---------- */
    --no2ta-font-arabic: 'Cairo', sans-serif;
    --no2ta-font-latin: 'Plus Jakarta Sans', sans-serif;
    --no2ta-font-mono: 'JetBrains Mono', ui-monospace, monospace;

    --no2ta-text-display: 1.75rem;   /* 28px */
    --no2ta-text-h1: 1.25rem;        /* 20px */
    --no2ta-text-h2: 1rem;           /* 16px */
    --no2ta-text-body-lg: 0.9375rem; /* 15px */
    --no2ta-text-body: 0.8125rem;    /* 13px */
    --no2ta-text-caption: 0.75rem;   /* 12px */
    --no2ta-text-micro: 0.656rem;    /* 10.5px — absolute floor, never smaller */

    /* ---------- 3.2 Radius ---------- */
    --no2ta-radius-xs: 8px;
    --no2ta-radius-sm: 10px;
    --no2ta-radius-md: 14px;
    --no2ta-radius-lg: 20px;
    --no2ta-radius-xl: 28px;
    --no2ta-radius-full: 9999px;

    /* ---------- 3.3 Elevation (ظلال أعمق ودافئة تناسب الخلفية الغرافيتية) ---------- */
    --no2ta-shadow-1: 0 1px 2px rgba(0, 0, 0, 0.4);
    --no2ta-shadow-2: 0 6px 16px rgba(0, 0, 0, 0.45);
    --no2ta-shadow-3: 0 20px 50px -12px rgba(0, 0, 0, 0.6);
    --no2ta-shadow-glow-accent: 0 0 0 1px var(--no2ta-border-accent), 0 4px 20px rgba(214, 178, 110, 0.25);

    /* ---------- 4. Motion ---------- */
    --no2ta-duration-fast: 120ms;
    --no2ta-duration-base: 200ms;
    --no2ta-duration-slow: 320ms;
    --no2ta-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);

    /* ---------- 5. Icons (Lucide — بديل الإيموجي، راجع DESIGN_SYSTEM.md §5) ---------- */
    --no2ta-icon-sm: 15px;
    --no2ta-icon-md: 17px;
    --no2ta-icon-lg: 20px;
    --no2ta-icon-stroke: 2;
}

~~~~


### المصدر: public/css/style.css

~~~~css
/* No2ta Custom Glassmorphic Styles */
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

:root {
    /* Aliased to the No2ta Design System tokens (design-tokens.css) —
       kept for backward compatibility with any var(--bg-primary) etc. usage. */
    --bg-primary: var(--no2ta-bg-canvas, #0A0F1C);
    --bg-secondary: var(--no2ta-bg-surface, #111827);
    --bg-card: var(--no2ta-bg-surface-raised, rgba(15, 23, 42, 0.75));
    --border-color: var(--no2ta-border-default, rgba(255, 255, 255, 0.08));
    --accent-cyan: var(--no2ta-primary-500, #06b6d4);
    --accent-purple: #8b5cf6;
    --accent-pink: #ec4899;
}

body {
    font-family: 'Cairo', sans-serif;
    background-color: var(--bg-primary);
    color: var(--no2ta-text-primary, #f8fafc);
    overflow-x: hidden;
}

.en-text {
    font-family: 'Plus Jakarta Sans', sans-serif;
}

/* Custom Scrollbars */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
::-webkit-scrollbar-track {
    background: transparent;
}
::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
}

/* Glassmorphism — Midnight & Brass tones (see design-tokens.css) */
.glass-panel {
    background: color-mix(in srgb, var(--no2ta-bg-surface, #161310) 85%, transparent);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--no2ta-border-subtle, rgba(214, 178, 110, 0.08));
}

.glass-panel-elevated {
    background: color-mix(in srgb, var(--no2ta-bg-surface-raised, #1F1A15) 92%, transparent);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--no2ta-border-default, rgba(214, 178, 110, 0.16));
    box-shadow: var(--no2ta-shadow-3, 0 20px 50px -12px rgba(0, 0, 0, 0.6));
}

.glass-button {
    background: var(--no2ta-border-subtle, rgba(214, 178, 110, 0.08));
    backdrop-filter: blur(8px);
    border: 1px solid var(--no2ta-border-default, rgba(214, 178, 110, 0.16));
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.glass-button:hover {
    background: var(--no2ta-border-default, rgba(214, 178, 110, 0.16));
    border-color: var(--no2ta-border-strong, rgba(214, 178, 110, 0.32));
    transform: translateY(-1px);
}

/* Story Gradient Ring Animation */
@keyframes spin-gradient {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.story-ring-unseen {
    position: relative;
    padding: 3px;
    border-radius: 9999px;
    background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
    box-shadow: 0 0 15px rgba(220, 39, 67, 0.4);
}

.story-ring-seen {
    position: relative;
    padding: 2px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.2);
}

/* Pulse / Live dot */
.live-glow {
    box-shadow: 0 0 10px #22c55e;
}

/* Disappearing message burn effect */
@keyframes burn-fade {
    0% { filter: drop-shadow(0 0 4px #f97316); opacity: 1; }
    50% { filter: drop-shadow(0 0 8px #ef4444); opacity: 0.8; }
    100% { filter: drop-shadow(0 0 12px #b91c1c); opacity: 0.3; }
}

.burn-pulse {
    animation: burn-fade 1.5s infinite alternate ease-in-out;
}

/* Chat Bubbles */
.chat-bubble-outgoing {
    background: linear-gradient(135deg, var(--no2ta-primary-600, #14B8A6) 0%, var(--no2ta-primary-700, #0F9488) 100%);
    color: #ffffff;
    border-radius: 18px 18px 4px 18px;
    box-shadow: 0 4px 12px rgba(45, 212, 191, 0.2);
}

.chat-bubble-incoming {
    background: var(--no2ta-bg-surface-raised, rgba(30, 41, 59, 0.85));
    color: var(--no2ta-text-primary, #f1f5f9);
    border-radius: 18px 18px 18px 4px;
    border: 1px solid var(--no2ta-border-subtle, rgba(255, 255, 255, 0.08));
}

/* Audio Player Waveform Visualizer Simulation */
.voice-bar {
    width: 3px;
    background-color: currentColor;
    border-radius: 9999px;
    transition: height 0.15s ease;
}

/* Whiteboard Canvas */
#whiteboardCanvas {
    touch-action: none;
    cursor: crosshair;
}

/* Panic Screen Iframe / Overlay */
#panicOverlay {
    transition: opacity 0.1s ease-in-out;
}

~~~~


### المصدر: public/index.html

~~~~html
<!DOCTYPE html>
<html lang="ar" dir="rtl" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>نؤطة (No2ta) - شبكة الفصل الاجتماعية</title>
    <link id="appFavicon" rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><rect width=%2224%22 height=%2224%22 rx=%226%22 fill=%22%23161310%22/><path d=%22M13 2 4 14h6l-1 8 9-12h-6l1-8z%22 fill=%22%23D6B26E%22/></svg>">

    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Lucide Icons — replaces all functional emoji, see docs/DESIGN_SYSTEM.md §5 -->
    <script src="https://unpkg.com/lucide@latest"></script>
    <script>
        /* No2ta Design System v1.1 "Midnight & Brass" — see docs/DESIGN_SYSTEM.md
           Remaps Tailwind's existing color scales onto the new warm-dark
           Midnight & Brass tokens so every existing utility class across
           the app picks up the new identity instantly, no markup rewrite. */
        tailwind.config = {
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
        }
    </script>

    <!-- No2ta Design System Tokens -->
    <link rel="stylesheet" href="/css/design-tokens.css">
    <!-- Custom CSS -->
    <link rel="stylesheet" href="/css/style.css">
    <!-- Socket.IO Client -->
    <script src="/socket.io/socket.io.js"></script>
    <!-- Audio Synthesizer -->
    <script src="/js/audio_synth.js"></script>
</head>
<body class="bg-[var(--no2ta-bg-canvas)] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-cyan-500 selection:text-black">

    <!-- 🌟 TOP GLOBAL HEADER — 3 Groups: Collaboration · Broadcast/Faith · Identity, Panic isolated last (DESIGN_SYSTEM.md §7.5) -->
    <header class="sticky top-0 z-40 bg-[var(--no2ta-bg-surface)]/90 backdrop-blur-xl border-b border-white/10 px-4 py-2">
        <div class="max-w-7xl mx-auto flex items-center justify-between gap-3">

            <!-- Group 1: Collaboration Tools -->
            <div class="flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5">
                <!-- AirDrop Button -->
                <button onclick="showModal('airdropModal')" class="flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold transition-all shadow-sm shrink-0" title="مشاركة الملفات السريعة في الفصل">
                    <i data-lucide="send" class="w-[15px] h-[15px]"></i>
                    <span class="hidden xl:inline">AirDrop</span>
                </button>

                <!-- Live Whiteboard Button (Collab tag) -->
                <button onclick="showModal('whiteboardModal')" class="flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all shadow-sm shrink-0" title="السبورة المشتركة">
                    <i data-lucide="pen-tool" class="w-[15px] h-[15px]"></i>
                    <span class="hidden xl:inline">السبورة</span>
                </button>

                <!-- Classroom CodePad Button (Collab tag) -->
                <button onclick="openCodepadModal()" class="flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all shadow-sm shrink-0" title="كشكول الأكواد والنصوص المشترك">
                    <i data-lucide="code-2" class="w-[15px] h-[15px]"></i>
                    <span class="hidden xl:inline">كشكول الأكواد</span>
                </button>

                <span class="w-px h-5 bg-white/10 shrink-0 mx-0.5"></span>

                <!-- Screen Share Button (Broadcast tag) -->
                <button id="screenShareToggleBtn" onclick="toggleScreenShare()" class="flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-bold transition-all shadow-sm relative shrink-0" title="بث شاشتي أو مشاهدة البث الحي لزملائي">
                    <i data-lucide="monitor-play" class="w-[15px] h-[15px]"></i>
                    <span id="screenShareBtnLabel" class="hidden xl:inline">بث الشاشة</span>
                    <span id="screenShareLiveDot" class="hidden w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                </button>

                <!-- Cairo Holy Quran Radio Broadcast Button (Faith tag) -->
                <button id="quranRadioBroadcastBtn" onclick="toggleBroadcastQuranRadio()" class="flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all shadow-sm relative shrink-0" title="تشغيل إذاعة القرآن الكريم من القاهرة على كل الأجهزة">
                    <i data-lucide="radio" class="w-[15px] h-[15px]"></i>
                    <span id="quranRadioBtnText" class="hidden xl:inline">إذاعة القرآن</span>
                    <span id="quranRadioLiveIndicator" class="hidden w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                </button>

                <!-- Classroom Radio Button (Media tag) -->
                <button id="radioToggleBtn" onclick="openMusicModal()" class="flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-400 text-xs font-bold transition-all shadow-sm relative shrink-0" title="راديو وموسيقى الفصل أونلاين">
                    <i data-lucide="music-2" class="w-[15px] h-[15px]"></i>
                    <span class="hidden xl:inline">أغاني الفصل</span>
                    <span id="radioPlayingIndicator" class="hidden w-2 h-2 rounded-full bg-pink-500 animate-ping"></span>
                </button>

                <!-- Electronic Tasbeeh Button (Faith tag) -->
                <button onclick="openTasbeehModal()" class="flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all shadow-sm shrink-0" title="السبحة الإلكترونية وعداد الأذكار">
                    <i data-lucide="circle-dot-dashed" class="w-[15px] h-[15px]"></i>
                    <span class="hidden xl:inline">السبحة</span>
                </button>

                <!-- Quick Math Challenge Button (Collab tag) -->
                <button onclick="showModal('mathGameModal')" class="flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all shadow-sm shrink-0" title="تحدي الرياضيات السريع">
                    <i data-lucide="swords" class="w-[15px] h-[15px]"></i>
                    <span class="hidden xl:inline">تحدي سريع</span>
                </button>

                <!-- Weekend Freeze Badge (Hidden unless active) -->
                <span id="weekendFreezeBadge" class="hidden px-2 py-0.5 rounded-full text-micro font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0">
                    <i data-lucide="snowflake" class="w-3 h-3 inline-block align-text-bottom"></i> الويك إند مجمّد
                </span>

                <span id="onlineCountBadge" class="hidden"></span>
            </div>

            <!-- Group 3: Identity & Status + isolated Panic Button -->
            <div class="flex items-center gap-2 shrink-0">
                <!-- Alexandria Time & Prayer Quick Pill -->
                <div id="alexandriaHeaderPill" onclick="openPrayerTimesModal()" class="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/25 hover:border-cyan-400/50 cursor-pointer transition-all shadow-sm group shrink-0" title="توقيت الإسكندرية، جدول الحصص، البريك، ومواقيت الصلاة - اضغط للتفاصيل">
                    <i data-lucide="clock" class="w-[15px] h-[15px] text-cyan-400"></i>
                    <div class="flex flex-col sm:flex-row sm:items-center sm:gap-1.5 leading-none">
                        <span id="headerAlexandriaClock" class="text-xs font-mono font-bold text-white tracking-wide">--:--:--</span>
                    </div>
                    <div class="hidden sm:flex items-center gap-1.5 pe-1 border-s border-white/10 ps-2">
                        <span id="headerSchoolStatusBadge" class="text-micro font-bold text-cyan-300">الحصة --</span>
                        <span id="headerSchoolBreakCountdown" class="text-micro font-mono text-amber-300">البريك: --</span>
                    </div>
                </div>
                <!-- NetSupport Lab Monitor Button (Admin Only) -->
                <button id="netSupportBtn" onclick="openNetSupportModal()" class="hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-black transition-all shadow-sm" title="مراقبة وتحكم معمل الفصل (NetSupport Live Show & Control)">
                    <i data-lucide="monitor" class="w-[15px] h-[15px]"></i>
                    <span class="hidden md:inline">مراقبة المعمل</span>
                    <span class="text-micro px-1.5 py-0.2 rounded-full bg-cyan-500/30 text-cyan-200 font-mono" id="netSupportOnlineCount">0</span>
                </button>

                <!-- Admin Dashboard Button -->
                <button id="adminDashboardBtn" onclick="openAdminDashboard()" class="hidden flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-400 text-xs font-bold transition-all">
                    <i data-lucide="crown" class="w-[15px] h-[15px]"></i>
                    <span class="hidden sm:inline">الأدمن</span>
                </button>

                <!-- User Profile Badge -->
                <div onclick="showModal('profileModal')" class="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
                    <div id="myAvatar" class="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden text-lg shrink-0 bg-cyan-500/15">🚀</div>
                    <div class="hidden sm:block text-right">
                        <span id="myNickname" class="text-xs font-bold text-white block leading-tight">أنا</span>
                        <span id="myRoleBadge" class="text-micro text-cyan-400">طالب</span>
                    </div>
                </div>

                <span class="w-px h-6 bg-white/10 shrink-0 mx-0.5"></span>

                <!-- THE LEGENDARY PANIC BUTTON ("زر البشمهندسة") — always isolated last -->
                <button id="panicTriggerBtn" title="زر البشمهندسة: إخفاء فوري متزامن لكتاب الفيزيكس (اضغط F2 أو Esc مرتين)" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition-all shadow-lg shadow-red-600/30 animate-pulse">
                    <i data-lucide="siren" class="w-[15px] h-[15px]"></i>
                    <span>البشمهندسة!</span>
                    <span class="text-micro bg-red-800/80 px-1 py-0.5 rounded font-mono hidden sm:inline">F2</span>
                </button>
            </div>
        </div>
    </header>

    <!-- STANDALONE LOCALHOST WARNING BANNER -->
    <div id="standaloneLocalhostBanner" class="hidden bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 border-b border-white/10 px-4 py-2 text-xs font-bold text-white flex flex-wrap items-center justify-between gap-2 shadow-xl">
        <div class="flex items-center gap-2">
            <i data-lucide="triangle-alert" class="w-[18px] h-[18px]"></i>
            <span>أنت فاتح السيرفر المحلي (localhost)! لكي ترى زملاءك في الفصل، يجب فتح عنوان سيرفر الأدمن.</span>
        </div>
        <button onclick="showModal('connectHostModal')" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950 text-cyan-400 hover:text-white transition-all font-black text-xs border border-white/20">
            <span>الاتصال بسيرفر الفصل الآن</span>
            <i data-lucide="link-2" class="w-[14px] h-[14px]"></i>
        </button>
    </div>

    <!-- 📸 INSTAGRAM STORIES RIBBON -->
    <section class="bg-[#090e1b] border-b border-white/5 py-2.5 px-4 overflow-x-auto">
        <div class="max-w-7xl mx-auto flex items-center gap-4" id="storiesList">
            <!-- Dynamic Stories Appended Here -->
        </div>
    </section>

    <!-- 💬 MAIN APPLICATION VIEW -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-3 overflow-hidden">
        
        <!-- SIDEBAR: CLASSMATES & CHATS (4 cols) -->
        <aside class="md:col-span-4 lg:col-span-3 glass-panel rounded-2xl flex flex-col h-[calc(100vh-165px)] overflow-hidden">
            <!-- Navigation Tabs -->
            <div class="p-2 border-b border-white/10 bg-slate-900/50">
                <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/5">
                    <button id="tabGeneralBtn" onclick="selectGeneralChat()" class="flex-1 py-1.5 text-[11px] font-bold rounded-lg bg-cyan-500 text-slate-950 transition-all flex items-center justify-center gap-1">
                        <i data-lucide="message-circle" class="w-[13px] h-[13px]"></i>
                        <span>الفصل</span>
                    </button>
                    <button id="tabGroupsBtn" onclick="switchSidebarTab('groups')" class="flex-1 py-1.5 text-[11px] font-semibold rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1">
                        <i data-lucide="users" class="w-[13px] h-[13px]"></i>
                        <span>الجروبات</span>
                        <span id="groupsCountBadge" class="hidden px-1.5 py-0.2 text-micro rounded-full bg-purple-500/30 text-purple-300 font-bold">0</span>
                    </button>
                    <button id="tabDirectBtn" onclick="switchSidebarTab('direct')" class="flex-1 py-1.5 text-[11px] font-semibold rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1">
                        <i data-lucide="user" class="w-[13px] h-[13px]"></i>
                        <span>الزملاء</span>
                    </button>
                </div>
            </div>

            <!-- Alexandria Prayer Times & Live Clock Sidebar Widget -->
            <div id="sidebarAlexandriaWidget" class="p-2.5 border-b border-white/10 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-emerald-950/20 shrink-0">
                <div class="flex items-center justify-between gap-1.5 mb-2 cursor-pointer group" onclick="openPrayerTimesModal()" title="اضغط لعرض جدول مواقيت الصلاة الكامل في الإسكندرية">
                    <div class="flex items-center gap-1.5 min-w-0">
                        <i data-lucide="moon-star" class="w-[15px] h-[15px] text-emerald-300 shrink-0"></i>
                        <div class="min-w-0">
                            <div class="flex items-center gap-1">
                                <span class="text-[11px] font-bold text-white group-hover:text-emerald-300 transition">مواقيت الصلاة</span>
                                <span class="text-micro px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">الإسكندرية</span>
                            </div>
                            <p id="sidebarAlexandriaDate" class="text-micro text-slate-400 truncate">--</p>
                        </div>
                    </div>
                    <div class="text-left font-mono shrink-0">
                        <div id="sidebarAlexandriaClock" class="text-xs font-black text-cyan-300 tracking-tight">--:--:--</div>
                        <div id="sidebarAlexandriaNextCountdown" class="text-micro text-amber-300 font-bold">باقي: --:--</div>
                    </div>
                </div>

                <!-- 5 Prayers Grid (3 cols so Arabic names never crowd/wrap) -->
                <div class="grid grid-cols-3 gap-1.5 text-center font-mono">
                    <div id="prayer_card_fajr" class="p-1.5 rounded-lg bg-black/40 border border-white/5 transition-all">
                        <div class="text-[11px] text-slate-400 truncate">الفجر</div>
                        <div id="prayer_time_fajr" class="text-[11px] font-bold text-slate-200 mt-0.5">--:--</div>
                    </div>
                    <div id="prayer_card_dhuhr" class="p-1.5 rounded-lg bg-black/40 border border-white/5 transition-all">
                        <div class="text-[11px] text-slate-400 truncate">الظهر</div>
                        <div id="prayer_time_dhuhr" class="text-[11px] font-bold text-slate-200 mt-0.5">--:--</div>
                    </div>
                    <div id="prayer_card_asr" class="p-1.5 rounded-lg bg-black/40 border border-white/5 transition-all">
                        <div class="text-[11px] text-slate-400 truncate">العصر</div>
                        <div id="prayer_time_asr" class="text-[11px] font-bold text-slate-200 mt-0.5">--:--</div>
                    </div>
                    <div id="prayer_card_maghrib" class="p-1.5 rounded-lg bg-black/40 border border-white/5 transition-all">
                        <div class="text-[11px] text-slate-400 truncate">المغرب</div>
                        <div id="prayer_time_maghrib" class="text-[11px] font-bold text-slate-200 mt-0.5">--:--</div>
                    </div>
                    <div id="prayer_card_isha" class="p-1.5 rounded-lg bg-black/40 border border-white/5 transition-all">
                        <div class="text-[11px] text-slate-400 truncate">العشاء</div>
                        <div id="prayer_time_isha" class="text-[11px] font-bold text-slate-200 mt-0.5">--:--</div>
                    </div>
                </div>

                <!-- School Sessions & Break Live Card 🔔 -->
                <div class="mt-2.5 pt-2 border-t border-white/10 text-xs">
                    <div class="flex items-center justify-between mb-1.5 cursor-pointer" onclick="openPrayerTimesModal()">
                        <div class="flex items-center gap-1.5 min-w-0">
                            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                            <span id="sidebarSchoolSessionBadge" class="text-[11px] font-black text-emerald-300 truncate">الحصة --</span>
                        </div>
                        <span id="sidebarSchoolSessionCountdown" class="text-micro font-mono font-bold text-cyan-300 shrink-0">باقي: --</span>
                    </div>

                    <!-- 3 School Countdowns Grid: Break, Bionic, Dismissal -->
                    <div class="grid grid-cols-3 gap-1 text-center font-mono text-micro">
                        <div class="p-1 rounded-lg bg-black/50 border border-white/5 flex flex-col justify-between">
                            <div class="text-slate-400 flex items-center justify-center gap-1"><i data-lucide="coffee" class="w-3 h-3"></i> البريك (11:10)</div>
                            <div id="sidebarSchoolBreakCountdown" class="font-bold text-amber-300 mt-0.5">باقي: --</div>
                        </div>
                        <div class="p-1 rounded-lg bg-black/50 border border-white/5 flex flex-col justify-between">
                            <div class="text-slate-400 flex items-center justify-center gap-1"><i data-lucide="flask-conical" class="w-3 h-3"></i> <span id="sidebarSchoolBionicLabel">البايونيك (3:30)</span></div>
                            <div id="sidebarSchoolBionicCountdown" class="font-bold text-purple-300 mt-0.5">باقي: --</div>
                        </div>
                        <div class="p-1 rounded-lg bg-black/50 border border-white/5 flex flex-col justify-between">
                            <div class="text-slate-400 flex items-center justify-center gap-1"><i data-lucide="home" class="w-3 h-3"></i> <span id="sidebarSchoolDismissalLabel">المرواح (4:00)</span></div>
                            <div id="sidebarSchoolDismissalCountdown" class="font-bold text-emerald-300 mt-0.5">باقي: --</div>
                        </div>
                    </div>

                    <!-- School Timetable Full Button -->
                    <button onclick="openSchoolScheduleModal()" class="w-full mt-2 py-1.5 px-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-micro font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                        <i data-lucide="calendar-days" class="w-[13px] h-[13px]"></i>
                        <span>عرض جدول مواعيد اليوم والحصص</span>
                    </button>
                </div>
            </div>

            <!-- Classmates / Groups List Header -->
            <div class="px-3 py-2 flex items-center justify-between text-xs text-slate-400 font-bold border-b border-white/5">
                <span id="sidebarSectionTitle">زملاء الفصل والـ Streaks</span>
                <div id="sidebarSectionAction">
                    <span class="text-micro text-cyan-400 font-normal flex items-center gap-1"><i data-lucide="zap" class="w-3 h-3"></i> تحديث حي</span>
                </div>
            </div>

            <!-- Classmates Scrollable Container -->
            <div id="usersListContainer" class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                <!-- Users Appended Dynamically -->
            </div>

            <!-- Groups Scrollable Container -->
            <div id="groupsListContainer" class="hidden flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                <!-- Groups Appended Dynamically -->
            </div>
        </aside>

        <!-- CENTRAL CHAT WINDOW (8 cols) -->
        <section class="md:col-span-8 lg:col-span-9 glass-panel rounded-2xl flex flex-col h-[calc(100vh-165px)] overflow-hidden relative">
            
            <!-- Chat Header -->
            <div class="p-3 border-b border-white/10 bg-slate-900/70 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                    <div id="currentChatAvatar" class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                        <i data-lucide="globe" class="w-[18px] h-[18px] text-cyan-400"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <h2 id="currentChatTitle" class="text-sm font-bold text-white truncate">شات الفصل العام (General)</h2>
                            <span id="directStreakBadge" class="hidden px-2 py-0.5 rounded-full text-micro font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">
                                <i data-lucide="flame" class="w-3 h-3 inline-block align-text-bottom"></i> استريك
                            </span>
                        </div>
                        <p id="currentChatSubtitle" class="text-[11px] text-slate-400 truncate">متاح لجميع الزملاء في الفصل</p>
                    </div>
                </div>

                <!-- Chat Controls -->
                <div class="flex items-center gap-1.5 shrink-0">
                    <!-- Group Action Controls -->
                    <div id="groupHeaderControls" class="hidden items-center gap-1.5">
                        <button id="groupHeaderJoinRequestsBtn" onclick="openGroupJoinRequestsModal()" class="hidden px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm" title="طلبات الانضمام للجروب">
                            <i data-lucide="user-plus" class="w-[13px] h-[13px]"></i>
                            <span>طلبات</span>
                            <span id="groupHeaderJoinRequestsCount" class="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-micro font-black font-mono">0</span>
                        </button>
                        <button onclick="openGroupMembersModal()" class="px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1" title="عرض أعضاء الجروب">
                            <i data-lucide="users" class="w-[13px] h-[13px]"></i>
                            <span>الأعضاء</span>
                            <span id="groupHeaderMembersCount" class="text-micro font-mono font-bold"></span>
                        </button>
                        <button id="groupHeaderDeleteBtn" onclick="handleDeleteCurrentGroup()" class="hidden px-2 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold transition-all" title="حذف الجروب">
                            <i data-lucide="trash-2" class="w-[13px] h-[13px]"></i>
                        </button>
                    </div>
                    <!-- Disappearing Message Selector -->
                    <div class="relative group">
                        <button id="disappearingToggleBtn" class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-all flex items-center gap-1">
                            <i data-lucide="timer" class="w-[13px] h-[13px]"></i>
                            <span>مؤقت</span>
                        </button>
                        <div class="absolute left-0 top-full mt-1 hidden group-hover:flex flex-col bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-2xl z-20 min-w-[125px]">
                            <button onclick="setDisappearingTimer(0)" class="text-right px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 rounded">بدون مؤقت</button>
                            <button onclick="setDisappearingTimer(2)" class="text-right px-2.5 py-1 text-xs text-orange-400 font-black hover:bg-slate-800 rounded flex items-center gap-1"><i data-lucide="zap" class="w-3 h-3"></i> 2 ثانية (فوري!)</button>
                            <button onclick="setDisappearingTimer(5)" class="text-right px-2.5 py-1 text-xs text-red-400 font-bold hover:bg-slate-800 rounded flex items-center gap-1"><i data-lucide="flame" class="w-3 h-3"></i> 5 ثوانٍ</button>
                            <button onclick="setDisappearingTimer(10)" class="text-right px-2.5 py-1 text-xs text-red-400 hover:bg-slate-800 rounded flex items-center gap-1"><i data-lucide="flame" class="w-3 h-3"></i> 10 ثوانٍ</button>
                            <button onclick="setDisappearingTimer(30)" class="text-right px-2.5 py-1 text-xs text-red-400 hover:bg-slate-800 rounded flex items-center gap-1"><i data-lucide="flame" class="w-3 h-3"></i> 30 ثانية</button>
                            <button onclick="setDisappearingTimer(60)" class="text-right px-2.5 py-1 text-xs text-red-400 hover:bg-slate-800 rounded flex items-center gap-1"><i data-lucide="flame" class="w-3 h-3"></i> 1 دقيقة</button>
                            <button onclick="setDisappearingTimer(300)" class="text-right px-2.5 py-1 text-xs text-red-400 hover:bg-slate-800 rounded flex items-center gap-1"><i data-lucide="flame" class="w-3 h-3"></i> 5 دقائق</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- INCOMING SCREEN SHARE BANNER (For Classmates) -->
            <div id="screenShareJoinNotification" class="hidden bg-gradient-to-r from-emerald-600/90 via-cyan-600/90 to-emerald-600/90 border-b border-white/10 px-4 py-2 text-xs font-bold text-white flex items-center justify-between shadow-lg">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping"></span>
                    <span id="screenShareJoinText">بدأ أحد الزملاء بث شاشته الآن! يمكنك المشاهدة والتفاعل جنباً إلى جنب في الشات.</span>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="joinScreenShare()" class="px-3.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-900 text-cyan-400 font-black text-xs transition-all shadow-md flex items-center gap-1.5">
                        <i data-lucide="monitor-play" class="w-[14px] h-[14px]"></i>
                        <span>مشاهدة البث</span>
                    </button>
                    <button onclick="dismissScreenShareNotification()" class="w-6 h-6 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center text-xs">
                        <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                </div>
            </div>

            <!-- LIVE SCREEN SHARE THEATER PANEL (بث الشاشة المباشر وسينما الفصل) -->
            <div id="screenShareTheaterPanel" class="hidden border-b border-white/10 bg-slate-950 flex flex-col transition-all duration-300 relative shrink-0">
                <!-- Screen Share Header -->
                <div class="px-3.5 py-2 bg-slate-900/90 border-b border-white/5 flex items-center justify-between text-xs">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                        <div class="flex items-center gap-1.5">
                            <span class="font-bold text-white text-xs">بث مباشر:</span>
                            <span id="screenSharePresenterName" class="text-cyan-400 font-extrabold text-xs">فارس</span>
                        </div>
                        <span id="screenShareStatusPill" class="flex items-center gap-1 text-micro px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> مباشر (Live)
                        </span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <!-- Volume mute/unmute toggle -->
                        <button id="screenShareAudioToggleBtn" onclick="toggleScreenShareAudio()" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1" title="كتم / تشغيل الصوت">
                            <i id="screenShareAudioIconOn" data-lucide="volume-2" class="w-[14px] h-[14px]"></i>
                            <i id="screenShareAudioIconOff" data-lucide="volume-x" class="hidden w-[14px] h-[14px]"></i>
                        </button>
                        <!-- Fullscreen -->
                        <button onclick="toggleScreenShareFullscreen()" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1" title="ملء الشاشة">
                            <i data-lucide="maximize" class="w-[14px] h-[14px]"></i>
                            <span class="hidden sm:inline">شاشة كاملة</span>
                        </button>
                        <!-- Picture-in-Picture -->
                        <button onclick="toggleScreenSharePiP()" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1" title="نافذة عائمة أثناء تصفح باقي التطبيقات">
                            <i data-lucide="picture-in-picture-2" class="w-[14px] h-[14px]"></i>
                            <span class="hidden sm:inline">نافذة عائمة</span>
                        </button>
                        <!-- Stop or Close -->
                        <button id="screenShareControlBtn" onclick="handleScreenShareControlClick()" class="px-2.5 py-1 rounded-lg bg-red-600/90 hover:bg-red-500 text-white text-xs font-bold transition-all flex items-center gap-1">
                            <i data-lucide="square" class="w-[13px] h-[13px]"></i>
                            <span id="screenShareControlBtnText">إيقاف البث</span>
                        </button>
                    </div>
                </div>

                <!-- Video Frame -->
                <div id="screenShareVideoWrapper" class="relative w-full bg-black flex items-center justify-center overflow-hidden h-[38vh] sm:h-[46vh] max-h-[500px]">
                    <video id="screenShareVideo" autoplay playsinline class="w-full h-full object-contain bg-black"></video>

                    <!-- Loading / Connecting Overlay -->
                    <div id="screenShareLoadingOverlay" class="hidden absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white">
                        <div class="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        <p class="text-xs font-bold text-cyan-300">جاري الاتصال بالبث المباشر للشاشة عبر الشبكة...</p>
                    </div>
                </div>
            </div>

            <!-- Focus Mode Warning Banner (if chat locked) -->
            <div id="chatFocusBanner" class="hidden bg-amber-500/20 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-300 font-bold flex items-center justify-between">
                <span>وضع التركيز الدراسي مفعل بواسطة الأدمن: الشات مقفول مؤقتاً للشرح!</span>
                <i data-lucide="lock" class="w-[14px] h-[14px] text-amber-400"></i>
            </div>

            <!-- Messages Stream -->
            <div id="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-1">
                <!-- Messages Appended Dynamically -->
            </div>

            <!-- Typing Indicator Pill -->
            <div id="chatTypingIndicator" class="hidden px-4 py-1 text-xs text-cyan-400 font-medium italic">
                فلان يكتب الآن...
            </div>

            <!-- Voice Recording Banner -->
            <div id="voiceRecordBanner" class="hidden bg-red-500/15 border-t border-red-500/30 px-4 py-2 flex items-center justify-between text-xs text-red-400 font-bold animate-pulse">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span>جاري تسجيل رسالة صوتية...</span>
                    <span id="voiceTimerText" class="en-text font-mono text-white">00:00</span>
                </div>
                <div class="flex items-center gap-2">
                    <button id="voiceCancelBtn" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"><i data-lucide="trash-2" class="w-3 h-3"></i> إلغاء</button>
                    <button onclick="toggleVoiceRecording()" class="px-2.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1"><i data-lucide="send" class="w-3 h-3"></i> إرسال</button>
                </div>
            </div>

            <!-- Chat Bottom Input Bar -->
            <div id="chatInputBarContainer" class="p-3 border-t border-white/10 bg-slate-900/60">
                <div id="groupLockedNoticeBar" class="hidden p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30 text-center text-xs text-amber-300 font-bold flex items-center justify-center gap-2">
                    <i data-lucide="lock" class="w-[14px] h-[14px]"></i>
                    <span>هذا الجروب خاص ومحمي • يجب قبول طلب انضمامك لتتمكن من إرسال الرسائل والمشاركة.</span>
                </div>
                <form id="chatForm" class="flex items-center gap-2">
                    <!-- File Attachment Button -->
                    <button type="button" onclick="document.getElementById('chatFileInput').click()" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all" title="إرفاق صورة أو فيديو أو ملف">
                        <i data-lucide="paperclip" class="w-[18px] h-[18px]"></i>
                    </button>
                    <input type="file" id="chatFileInput" class="hidden" accept="image/*,video/*,audio/*,.pdf,.zip,.rar,.docx">

                    <!-- Code Snippet Button -->
                    <button type="button" onclick="openCodeSnippetModal()" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 flex items-center justify-center font-mono font-bold text-sm transition-all" title="مشاركة كود برمجى أو نص خام (Code / Plain Text)">
                        <i data-lucide="code-2" class="w-[18px] h-[18px]"></i>
                    </button>

                    <!-- Text Input Field -->
                    <input type="text" id="messageInput" placeholder="اكتب رسالتك لزمايلك في الفصل... (اضغط Enter للإرسال)" class="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all">

                    <!-- Voice Recorder Button -->
                    <button type="button" id="voiceRecordBtn" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all" title="تسجيل صوتي (WhatsApp Voice Note)">
                        <i data-lucide="mic" class="w-[18px] h-[18px]"></i>
                    </button>

                    <!-- Send Button -->
                    <button type="submit" id="sendMsgBtn" class="px-4 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20">
                        <span>إرسال</span>
                        <i data-lucide="send" class="w-[15px] h-[15px]"></i>
                    </button>
                </form>
            </div>
        </section>
    </main>

    <!-- ======================================================== -->
    <!-- 🚨 THE FULLSCREEN STEALTH OVERLAY (كتاب وكويز الفيزيكس) 🚨 -->
    <!-- ======================================================== -->
    <div id="stealthPhysicsOverlay" class="hidden fixed inset-0 z-50 bg-[#030712] flex flex-col">
        <!-- Discreet Teacher Safety Top Bar -->
        <div class="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between text-xs text-gray-400">
            <div class="flex items-center gap-2">
                <i data-lucide="book-marked" class="w-4 h-4 text-cyan-400"></i>
                <span class="font-extrabold text-white">المركز القومي للمناهج والتقويم التربوي - بنك أسئلة ونموذج إجابة مادة تطبيقات الهاتف (Flutter Competency Model Revision)</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-gray-500 hidden sm:inline">Flutter Competency Assessment • Mobile App Development</span>
                <!-- F3 Close on this device only (Requires Password) -->
                <button onclick="promptLocalStealthUnlock()" class="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-cyan-400 hover:text-white transition-all text-[11px] font-mono font-bold flex items-center gap-1">
                    <i data-lucide="lock" class="w-3 h-3"></i> F3 إغلاق عندي فقط
                </button>
                <!-- Admin Only Global Unlock -->
                <button id="stealthGlobalUnlockBtn" onclick="promptGlobalStealthUnlock()" class="hidden px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-all text-[11px] font-bold flex items-center gap-1">
                    <i data-lucide="crown" class="w-3 h-3"></i> فك للجميع
                </button>
            </div>
        </div>
        <!-- Iframe with authentic Solved Physics Revision -->
        <iframe id="stealthIframe" src="/stealth/physics.html" class="flex-1 w-full h-full border-none bg-gray-950"></iframe>
    </div>

    <!-- ======================================================== -->
    <!-- 📦 MODALS (AirDrop, Whiteboard, Stories, Admin, Auth) -->
    <!-- ======================================================== -->

    <!-- 1. AUTH / LOGIN MODAL -->
    <div id="authModal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div class="glass-panel-elevated rounded-3xl p-6 sm:p-8 max-w-md w-full border border-white/10 relative">
            <div class="text-center mb-6">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-cyan-700 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/30">
                    <i data-lucide="zap" class="w-7 h-7 text-slate-950" fill="currentColor"></i>
                </div>
                <h3 class="text-xl font-black text-white">دخول شبكة فصل "نؤطة"</h3>
                <p class="text-xs text-slate-400 mt-1">تطبيق التواصل السري والمحلي لشبكة الفصل</p>
            </div>

            <form id="authForm" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1">كلمة مرور الفصل السرية (Master Password)</label>
                    <input type="password" id="authPassword" placeholder="اكتب [REDACTED_SHARED_PASSWORD]" value="[REDACTED_SHARED_PASSWORD]" class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1">اسم الشهرة أو اللقب (Nickname)</label>
                    <input type="text" id="authNickname" placeholder="مثال: الباشمهندس أحمد، دحيح الفيزيا..." class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-2">صورتك الشخصية (Avatar)</label>
                    
                    <!-- Upload from Device -->
                    <div class="p-3 bg-slate-950 rounded-2xl border border-slate-800 mb-2.5 flex items-center justify-between gap-2.5">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div id="authAvatarCustomPreview" class="w-11 h-11 rounded-full border border-cyan-500 overflow-hidden bg-slate-900 flex items-center justify-center text-lg shrink-0">
                                🚀
                            </div>
                            <div class="min-w-0">
                                <p class="text-xs font-bold text-white leading-tight">ارفع صورة من جهازك</p>
                                <p class="text-micro text-slate-400 flex items-center gap-1"><i data-lucide="camera" class="w-3 h-3"></i> صورة شخصية حقيقية لك</p>
                            </div>
                        </div>
                        <button type="button" onclick="document.getElementById('authAvatarFileInput').click()" class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold transition-all border border-slate-700">
                            <i data-lucide="upload" class="w-[13px] h-[13px]"></i>
                            <span>اختيار ملف</span>
                        </button>
                        <input type="file" id="authAvatarFileInput" accept="image/*" class="hidden">
                    </div>

                    <span class="block text-[11px] text-slate-400 mb-1.5">أو اختر رمزاً تعبيرياً (Emoji):</span>
                    <div class="grid grid-cols-6 gap-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800">
                        <label class="cursor-pointer"><input type="radio" name="authAvatar" value="🚀" checked class="hidden peer"><span class="w-full aspect-square rounded-lg flex items-center justify-center text-lg bg-slate-900 border border-transparent peer-checked:bg-cyan-500/20 peer-checked:border-cyan-400 transition-all">🚀</span></label>
                        <label class="cursor-pointer"><input type="radio" name="authAvatar" value="⚡" class="hidden peer"><span class="w-full aspect-square rounded-lg flex items-center justify-center text-lg bg-slate-900 border border-transparent peer-checked:bg-cyan-500/20 peer-checked:border-cyan-400 transition-all">⚡</span></label>
                        <label class="cursor-pointer"><input type="radio" name="authAvatar" value="🧠" class="hidden peer"><span class="w-full aspect-square rounded-lg flex items-center justify-center text-lg bg-slate-900 border border-transparent peer-checked:bg-cyan-500/20 peer-checked:border-cyan-400 transition-all">🧠</span></label>
                        <label class="cursor-pointer"><input type="radio" name="authAvatar" value="👑" class="hidden peer"><span class="w-full aspect-square rounded-lg flex items-center justify-center text-lg bg-slate-900 border border-transparent peer-checked:bg-cyan-500/20 peer-checked:border-cyan-400 transition-all">👑</span></label>
                        <label class="cursor-pointer"><input type="radio" name="authAvatar" value="🔥" class="hidden peer"><span class="w-full aspect-square rounded-lg flex items-center justify-center text-lg bg-slate-900 border border-transparent peer-checked:bg-cyan-500/20 peer-checked:border-cyan-400 transition-all">🔥</span></label>
                        <label class="cursor-pointer"><input type="radio" name="authAvatar" value="🕶️" class="hidden peer"><span class="w-full aspect-square rounded-lg flex items-center justify-center text-lg bg-slate-900 border border-transparent peer-checked:bg-cyan-500/20 peer-checked:border-cyan-400 transition-all">🕶️</span></label>
                    </div>
                </div>

                <div id="authError" class="hidden text-xs text-red-400 font-bold bg-red-500/10 p-2.5 rounded-xl border border-red-500/20 text-center"></div>

                <button type="submit" class="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm transition-all shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2">
                    <span>دخول المنصة</span>
                    <i data-lucide="log-in" class="w-4 h-4"></i>
                </button>
            </form>
        </div>
    </div>

    <!-- 2. NETWORK & QR CODE MODAL -->
    <div id="networkModal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div class="glass-panel-elevated rounded-3xl p-6 max-w-sm w-full text-center relative border border-white/10">
            <button onclick="hideModal('networkModal')" class="absolute top-4 left-4 text-slate-400 hover:text-white">✕</button>
            <h3 class="text-base font-black text-white mb-1 flex items-center justify-center gap-1.5"><i data-lucide="wifi" class="w-4 h-4"></i> دخول الزملاء عبر الـ Wi-Fi</h3>
            <p class="text-xs text-slate-400 mb-4">امسح الكود بكاميرا الموبايل للدخول المباشر للشات</p>

            <div class="p-3 bg-white rounded-2xl inline-block mb-3 shadow-xl">
                <img id="networkQrImg" class="w-48 h-48 mx-auto" alt="QR Code">
            </div>

            <p id="networkHostUrl" class="font-mono text-cyan-400 text-sm font-bold bg-slate-950 py-1.5 px-3 rounded-xl border border-slate-800 break-all select-all mb-3"></p>

            <div class="text-[11px] text-slate-400 space-y-1 text-right bg-slate-900/50 p-2.5 rounded-xl border border-white/5">
                <div class="flex justify-between"><span>الـ IP المكتشف لجهازك:</span> <span id="clientDetectedIp" class="text-white font-mono">-</span></div>
                <div class="flex justify-between"><span>الـ MAC Address لجهازك:</span> <span id="clientDetectedMac" class="text-white font-mono">-</span></div>
            </div>
        </div>
    </div>

    <!-- 3. AIRDROP MODAL -->
    <div id="airdropModal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div class="glass-panel-elevated rounded-3xl p-6 max-w-xl w-full border border-white/10 flex flex-col max-h-[85vh]">
            <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div class="flex items-center gap-2">
                    <i data-lucide="send" class="w-5 h-5 text-cyan-400"></i>
                    <h3 class="text-base font-black text-white">Classroom AirDrop (مشاركة الملفات السريعة)</h3>
                </div>
                <button onclick="hideModal('airdropModal')" class="text-slate-400 hover:text-white">✕</button>
            </div>

            <!-- Drag and drop zone -->
            <div id="airdropDropZone" class="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-6 text-center cursor-pointer transition-all mb-4 bg-slate-950/40">
                <i data-lucide="folder-up" class="w-8 h-8 mx-auto mb-2 text-slate-500"></i>
                <p class="text-xs font-bold text-white mb-1">اضغط هنا أو اسحب أي ملف لمشاركته فوراً مع الفصل</p>
                <p class="text-micro text-slate-400">بدون استهلاك باقة الإنترنت • مشاركة فائقة السرعة على شبكة الفصل</p>
                <input type="file" id="airdropFileInput" class="hidden">
            </div>

            <div id="airdropUploadProgress" class="hidden text-xs text-cyan-400 font-bold text-center py-1">
                جاري الرفع بسرعة الشبكة المحلية...
            </div>

            <!-- Files List -->
            <h4 class="text-xs font-bold text-slate-300 mb-2">الملفات المتاحة للتحميل في الفصل:</h4>
            <div id="airdropFilesList" class="flex-1 overflow-y-auto space-y-2 max-h-60 pr-1">
                <!-- Dynamically loaded -->
            </div>
        </div>
    </div>

    <!-- 4. LIVE WHITEBOARD MODAL -->
    <div id="whiteboardModal" class="hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
        <div class="glass-panel-elevated rounded-3xl p-4 max-w-4xl w-full border border-white/10 flex flex-col h-[90vh]">
            <!-- Whiteboard Toolbar -->
            <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10 mb-2">
                <div class="flex items-center gap-2">
                    <i data-lucide="pen-tool" class="w-[18px] h-[18px] text-indigo-300"></i>
                    <h3 class="text-sm font-black text-white">السبورة التفاعلية الحية المشتركة</h3>
                </div>

                <div class="flex items-center gap-2">
                    <!-- Color Palette -->
                    <div class="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button onclick="setWhiteboardColor('#06b6d4')" class="w-6 h-6 rounded-full bg-cyan-400"></button>
                        <button onclick="setWhiteboardColor('#8b5cf6')" class="w-6 h-6 rounded-full bg-purple-500"></button>
                        <button onclick="setWhiteboardColor('#22c55e')" class="w-6 h-6 rounded-full bg-emerald-500"></button>
                        <button onclick="setWhiteboardColor('#eab308')" class="w-6 h-6 rounded-full bg-yellow-500"></button>
                        <button onclick="setWhiteboardColor('#ffffff')" class="w-6 h-6 rounded-full bg-white"></button>
                        <button onclick="setWhiteboardEraser()" class="px-2 py-0.5 text-xs text-slate-300 font-bold hover:text-white" title="ممحاة"><i data-lucide="eraser" class="w-[14px] h-[14px]"></i></button>
                    </div>

                    <!-- Clear Board -->
                    <button onclick="emitClearWhiteboard()" class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white text-xs font-bold transition-all">
                        <i data-lucide="trash-2" class="w-3 h-3"></i> مسح
                    </button>
                    <!-- Export Image -->
                    <button onclick="exportWhiteboardImage()" class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold transition-all">
                        <i data-lucide="download" class="w-3 h-3"></i> تصدير
                    </button>
                    <!-- Close -->
                    <button onclick="hideModal('whiteboardModal')" class="text-slate-400 hover:text-white px-2">✕</button>
                </div>
            </div>

            <!-- Interactive HTML5 Canvas -->
            <div class="flex-1 bg-[#070a13] rounded-2xl border border-slate-800 overflow-hidden relative">
                <canvas id="whiteboardCanvas" class="w-full h-full block"></canvas>
            </div>
        </div>
    </div>

    <!-- 4b. COLLABORATIVE LIVE CODEPAD MODAL (Plain Text / Code Bin) -->
    <div id="codepadModal" class="hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
        <div class="glass-panel-elevated rounded-3xl p-4 sm:p-5 max-w-4xl w-full border border-indigo-500/30 flex flex-col h-[90vh]">
            <!-- CodePad Header & Actions Toolbar -->
            <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10 mb-2">
                <div class="flex items-center gap-2">
                    <i data-lucide="code-2" class="w-5 h-5 text-indigo-300"></i>
                    <div>
                        <div class="flex items-center gap-2">
                            <h3 class="text-sm font-black text-white">كشكول الأكواد والنصوص المشترك (Live CodePad)</h3>
                            <span class="px-2 py-0.5 rounded-full text-micro font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                                <i data-lucide="zap" class="w-3 h-3"></i> تحديث حي لجميع الطلاب
                            </span>
                        </div>
                        <p id="codepadStats" class="text-micro text-slate-400 font-mono mt-0.5">0 سطر • 0 حرف</p>
                    </div>
                </div>

                <div class="flex items-center flex-wrap gap-2">
                    <!-- Copy All Button -->
                    <button id="copyAllCodepadBtn" onclick="copyAllCodePadText()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-cyan-500/20">
                        <i data-lucide="copy" class="w-[14px] h-[14px]"></i>
                        <span>نسخ كل الكود</span>
                    </button>

                    <!-- Send to Chat Button -->
                    <button onclick="shareCodePadToChat()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20" title="إرسال محتوى الكشكول لغرفة الشات الحالية">
                        <i data-lucide="send" class="w-[14px] h-[14px]"></i>
                        <span>إرسال للشات</span>
                    </button>

                    <!-- Clear Scratchpad Button -->
                    <button onclick="clearCodePadText()" class="px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-400 hover:text-red-300 text-xs font-bold transition-all border border-red-500/30 flex items-center gap-1" title="تفريغ الكشكول">
                        <i data-lucide="trash-2" class="w-[13px] h-[13px]"></i> مسح
                    </button>

                    <!-- Close -->
                    <button onclick="hideModal('codepadModal')" class="text-slate-400 hover:text-white px-2 py-1 text-sm font-bold">✕</button>
                </div>
            </div>

            <!-- CodePad Editor Body -->
            <div class="flex-1 bg-[#060a14] rounded-2xl border border-slate-800 p-2 flex flex-col overflow-hidden relative shadow-inner">
                <textarea id="sharedCodePadTextarea" spellcheck="false" dir="ltr" placeholder="// ضع أي كود أو مسألة برمجية أو نص هنا...&#10;// سيظهر فوراً لجميع زمايلك في الفصل المتصلين بالسيرفر!&#10;// يمكنك الضغط على زر 'نسخ كل الكود' لأخذه بضغطة واحدة." class="flex-1 w-full h-full bg-transparent text-cyan-300 font-mono text-xs sm:text-sm p-3 outline-none resize-none leading-relaxed select-all placeholder-slate-600 focus:ring-0"></textarea>
            </div>

            <!-- CodePad Footer Tips -->
            <div class="pt-2 px-1 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                <div class="flex items-center gap-1.5">
                    <i data-lucide="lightbulb" class="w-3.5 h-3.5 text-amber-300 shrink-0"></i>
                    <span><b class="text-slate-300">نصيحة:</b> اضغط زر <b class="text-cyan-400">Tab</b> لعمل مسافات برمجية، واستخدم <b class="text-cyan-400">نسخ كل الكود</b> لنقله للمحرر عندك فوراً.</span>
                </div>
                <span id="codepadSyncIndicator" class="text-micro text-emerald-400 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>متصل ومتزامن</span>
                </span>
            </div>
        </div>
    </div>

    <!-- 4c. IN-CHAT CODE SNIPPET SHARING MODAL -->
    <div id="codeSnippetModal" class="hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
        <div class="glass-panel-elevated rounded-3xl p-5 sm:p-6 max-w-xl w-full border border-cyan-500/30 flex flex-col relative">
            <button onclick="hideModal('codeSnippetModal')" class="absolute top-4 left-4 text-slate-400 hover:text-white">✕</button>
            
            <div class="flex items-center gap-2 mb-3">
                <span class="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono font-black text-sm">&lt;/&gt;</span>
                <div>
                    <h3 class="text-sm font-black text-white">مشاركة كود برمجى أو نص خام (Code Snippet)</h3>
                    <p class="text-[11px] text-slate-400">سيتم إرساله للشات مع زر نسخ سريع مخصص لكل الطلاب</p>
                </div>
            </div>

            <form id="codeSnippetForm" class="space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-bold text-slate-300 mb-1">عنوان أو اسم الملف (اختياري)</label>
                        <input type="text" id="snippetTitleInput" placeholder="مثال: main.cpp أو query.sql" class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-300 mb-1">اللغة البرمجية</label>
                        <select id="snippetLanguageSelect" class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none">
                            <option value="C++">C++</option>
                            <option value="Python">Python</option>
                            <option value="JavaScript">JavaScript / Node.js</option>
                            <option value="Java">Java</option>
                            <option value="SQL">SQL Database</option>
                            <option value="HTML/CSS">HTML / CSS</option>
                            <option value="C#">C# / .NET</option>
                            <option value="Bash">Terminal / Bash</option>
                            <option value="Plain Text" selected>نص عادي (Plain Text)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1">الكود أو النص المراد مشاركته:</label>
                    <textarea id="snippetCodeInput" rows="8" spellcheck="false" dir="ltr" placeholder="// الصق الكود أو النص البرمجي هنا..." class="w-full bg-[#060a14] border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs font-mono text-cyan-300 outline-none resize-none leading-relaxed select-all"></textarea>
                </div>

                <div class="flex items-center justify-end gap-2 pt-1">
                    <button type="button" onclick="hideModal('codeSnippetModal')" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all">
                        إلغاء
                    </button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5">
                        <span>إرسال الكود للشات</span>
                        <span>🚀</span>
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- 5. STORY CREATOR MODAL -->
    <div id="storyCreatorModal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div class="glass-panel-elevated rounded-3xl p-6 max-w-md w-full border border-white/10 relative">
            <button onclick="hideModal('storyCreatorModal')" class="absolute top-4 left-4 text-slate-400 hover:text-white">✕</button>
            <h3 class="text-base font-black text-white mb-3">نشر استوري جديد 📸</h3>

            <form id="storyCreateForm" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1">نص الاستوري (اختياري لو هترفع صورة)</label>
                    <textarea id="storyTextInput" rows="3" placeholder="اكتب ميم أو سؤال أو ملاحظة هنا..." class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-sm text-white outline-none"></textarea>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1">لون الخلفية (للاستوري النصي)</label>
                    <div class="flex items-center gap-3">
                        <label class="cursor-pointer"><input type="radio" name="storyGradient" value="from-purple-600 to-pink-500" checked class="hidden peer"><span class="w-8 h-8 rounded-full block bg-gradient-to-tr from-purple-600 to-pink-500 ring-2 ring-transparent peer-checked:ring-cyan-400"></span></label>
                        <label class="cursor-pointer"><input type="radio" name="storyGradient" value="from-blue-600 to-cyan-500" class="hidden peer"><span class="w-8 h-8 rounded-full block bg-gradient-to-tr from-blue-600 to-cyan-500 ring-2 ring-transparent peer-checked:ring-cyan-400"></span></label>
                        <label class="cursor-pointer"><input type="radio" name="storyGradient" value="from-emerald-600 to-teal-500" class="hidden peer"><span class="w-8 h-8 rounded-full block bg-gradient-to-tr from-emerald-600 to-teal-500 ring-2 ring-transparent peer-checked:ring-cyan-400"></span></label>
                        <label class="cursor-pointer"><input type="radio" name="storyGradient" value="from-orange-600 to-amber-500" class="hidden peer"><span class="w-8 h-8 rounded-full block bg-gradient-to-tr from-orange-600 to-amber-500 ring-2 ring-transparent peer-checked:ring-cyan-400"></span></label>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1">رفع صورة أو فيديو للاستوري (من جهازك):</label>
                    <div id="storyDropZone" onclick="document.getElementById('storyFileInput').click()" class="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-4 text-center cursor-pointer transition-all bg-slate-950/50">
                        <div id="storyFileEmptyState">
                            <span class="text-3xl block mb-1">📷</span>
                            <p class="text-xs font-bold text-cyan-300">اضغط هنا لاختيار صورة من جهازك</p>
                            <p class="text-micro text-slate-400">يدعم الصور من الكمبيوتر أو الموبايل</p>
                        </div>
                        <div id="storyFilePreviewState" class="hidden flex flex-col items-center gap-2">
                            <img id="storyImagePreview" class="max-h-40 rounded-xl object-contain shadow-lg border border-white/10" />
                            <button type="button" onclick="event.stopPropagation(); removeStorySelectedFile();" class="text-xs text-red-400 hover:text-red-300 font-bold bg-slate-900 px-3 py-1 rounded-lg border border-red-500/30">
                                إلغاء الصورة ✕
                            </button>
                        </div>
                        <input type="file" id="storyFileInput" accept="image/*,video/*" class="hidden">
                    </div>
                </div>

                <button type="submit" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-sm transition-all shadow-lg">
                    نشر في الاستوري الآن 🔥
                </button>
            </form>
        </div>
    </div>

    <!-- 6. STORY VIEWER MODAL (Full Immersive Display) -->
    <div id="storyViewerModal" class="hidden fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4">
        <div class="max-w-lg w-full relative flex flex-col items-center">
            <!-- Story Header -->
            <div class="w-full flex items-center justify-between px-2 mb-2">
                <div class="flex items-center gap-2.5">
                    <div id="storyViewerAvatar" class="w-10 h-10 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-lg overflow-hidden shrink-0"></div>
                    <div>
                        <h4 id="storyViewerName" class="text-sm font-bold text-white leading-tight"></h4>
                        <button id="storyViewersBadge" onclick="openStoryViewsModal()" class="text-[11px] text-cyan-400 hover:text-cyan-300 bg-white/10 hover:bg-white/15 px-2.5 py-0.5 rounded-full font-bold transition-all flex items-center gap-1 cursor-pointer mt-0.5" title="اضغط لمعرفة من شاهد الاستوري">
                            <i data-lucide="eye" class="w-3 h-3"></i> 0 مشاهدة
                        </button>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button id="deleteStoryBtn" onclick="deleteCurrentActiveStory()" class="hidden px-2.5 py-1 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white text-xs font-bold transition-all flex items-center gap-1" title="حذف هذا الاستوري">
                        <span>🗑️</span>
                        <span>مسح</span>
                    </button>
                    <button onclick="hideModal('storyViewerModal')" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold">✕</button>
                </div>
            </div>

            <!-- Story Body -->
            <div id="storyViewerBody" class="w-full relative mb-3">
                <!-- Content dynamically rendered -->
            </div>

            <!-- Navigation Controls & Viewers Bar -->
            <div class="w-full flex flex-col gap-2 px-2">
                <!-- Big Prominent Viewers Button -->
                <button onclick="openStoryViewsModal()" class="w-full py-2.5 px-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-cyan-300 text-xs font-bold flex items-center justify-between border border-cyan-500/30 transition-all cursor-pointer shadow-lg group">
                    <div class="flex items-center gap-2">
                        <i data-lucide="eye" class="w-4 h-4 group-hover:scale-110 transition-transform"></i>
                        <span id="storyViewersBottomBtnText">المشاهدات (0) • اضغط لرؤية من شاهد الاستوري</span>
                    </div>
                    <span class="text-[11px] bg-cyan-500/20 px-2 py-0.5 rounded-full text-cyan-400 font-bold">عرض القائمة ◀</span>
                </button>
                <div class="w-full flex items-center justify-between">
                    <button onclick="prevStory()" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all">◀ السابق</button>
                    <button onclick="nextStory()" class="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all">التالي ▶</button>
                </div>
            </div>
        </div>
    </div>

    <!-- 6b. STORY VIEWERS LIST MODAL -->
    <div id="storyViewsModal" class="hidden fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4" style="z-index: 99999 !important;">
        <div class="glass-panel-elevated rounded-3xl p-5 max-w-sm w-full border border-white/10 relative flex flex-col max-h-[75vh]">
            <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div class="flex items-center gap-2">
                    <i data-lucide="eye" class="w-5 h-5 text-cyan-400"></i>
                    <h3 class="text-sm font-bold text-white">مشاهدو الاستوري</h3>
                    <span id="storyViewsModalCount" class="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold">0</span>
                </div>
                <button onclick="hideModal('storyViewsModal')" class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs">✕</button>
            </div>
            <!-- List of viewers -->
            <div id="storyViewersList" class="overflow-y-auto space-y-2 flex-1 pr-1 custom-scrollbar">
                <!-- Dynamically rendered viewers -->
            </div>
        </div>
    </div>

    <!-- 7. ADMIN DASHBOARD MODAL -->
    <div id="adminModal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div class="glass-panel-elevated rounded-3xl p-6 max-w-3xl w-full border border-white/10 max-h-[85vh] flex flex-col">
            <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div class="flex items-center gap-2">
                    <span class="text-xl">👑</span>
                    <h3 class="text-base font-black text-amber-400">لوحة تحكم وفيتشرات الأدمن الخارقة</h3>
                </div>
                <button onclick="hideModal('adminModal')" class="text-slate-400 hover:text-white">✕</button>
            </div>

            <!-- Admin Action Buttons Row -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                <button id="adminQuranRadioBtn" onclick="toggleBroadcastQuranRadio()" class="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs hover:bg-emerald-500/25 transition-all text-center flex items-center justify-center gap-1.5">
                    <span>📻</span>
                    <span id="adminQuranRadioBtnText">إذاعة القرآن (لكل الأجهزة)</span>
                </button>
                <button onclick="adminBroadcastAlert()" class="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold text-xs hover:bg-cyan-500/25 transition-all text-center">
                    📢 إذاعة عامة لجميع الشاشات
                </button>
                <button id="adminToggleFocusBtn" onclick="adminToggleFocusMode()" class="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs hover:bg-amber-500/25 transition-all text-center">
                    🔒 تفعيل وضع التركيز (قفل الشات)
                </button>
                <button onclick="adminStealthRelease()" class="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs hover:bg-emerald-500/25 transition-all text-center">
                    🛡️ زر "البشمهندسة مشيت" (فك الإخفاء)
                </button>
            </div>

            <!-- Devices Table -->
            <h4 class="text-xs font-bold text-slate-300 mb-2">الأجهزة المتصلة حالياً في الفصل (Classroom Hardware Radar):</h4>
            <div class="flex-1 overflow-y-auto border border-slate-800 rounded-xl">
                <table class="w-full text-right border-collapse">
                    <thead>
                        <tr class="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                            <th class="py-2 px-3">الطالب</th>
                            <th class="py-2 px-3">الـ IP</th>
                            <th class="py-2 px-3">الـ MAC Address</th>
                            <th class="py-2 px-3">الرتبة</th>
                            <th class="py-2 px-3">إجراء</th>
                        </tr>
                    </thead>
                    <tbody id="adminDevicesTable">
                        <!-- Devices dynamically loaded -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- 8. GLOBAL ANNOUNCEMENT MODAL -->
    <div id="announcementModal" class="hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <div class="glass-panel-elevated rounded-3xl p-6 sm:p-8 max-w-md w-full border border-amber-500/40 text-center relative shadow-2xl shadow-amber-500/20">
            <span class="text-4xl block mb-2">📢</span>
            <h3 id="announcementTitle" class="text-lg font-black text-amber-400 mb-2">إذاعة الفصل العامة</h3>
            <p id="announcementText" class="text-sm text-white font-semibold leading-relaxed mb-4 bg-slate-950/70 p-4 rounded-2xl border border-white/5"></p>
            <p id="announcementTime" class="text-micro text-slate-500 mb-4"></p>
            <button onclick="hideModal('announcementModal')" class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all">
                علم، مفهوم 🫡
            </button>
        </div>
    </div>

    <!-- 10. PROFILE EDIT MODAL -->
    <div id="profileModal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div class="glass-panel-elevated rounded-3xl p-6 max-w-md w-full border border-white/10 relative">
            <button onclick="hideModal('profileModal')" class="absolute top-4 left-4 text-slate-400 hover:text-white">✕</button>
            <h3 class="text-base font-black text-white mb-3">تعديل ملفي الشخصي 👤</h3>

            <form id="profileEditForm" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1">الاسم المستعار (Nickname)</label>
                    <input type="text" id="editNickname" class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1">الحالة الشخصية (Bio)</label>
                    <input type="text" id="editBio" placeholder="طالب جامد في فصل العباقرة ⚡" class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-2">صورتك الشخصية (Avatar)</label>
                    
                    <!-- Upload Profile Photo From Device -->
                    <div class="p-3 bg-slate-950 rounded-2xl border border-slate-800 mb-3 flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3 min-w-0">
                            <div id="editAvatarCustomPreview" class="w-12 h-12 rounded-full border-2 border-cyan-500 overflow-hidden bg-slate-900 flex items-center justify-center text-xl shrink-0">
                                🚀
                            </div>
                            <div class="min-w-0">
                                <p class="text-xs font-bold text-white leading-tight">اختر صورة من جهازك</p>
                                <p class="text-micro text-slate-400 flex items-center gap-1"><i data-lucide="camera" class="w-3 h-3"></i> صورة شخصية حقيقية لك</p>
                            </div>
                        </div>
                        <button type="button" onclick="document.getElementById('editAvatarFileInput').click()" class="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-cyan-500/20">
                            <i data-lucide="upload" class="w-[13px] h-[13px]"></i>
                            <span>اختيار ملف</span>
                        </button>
                        <input type="file" id="editAvatarFileInput" accept="image/*" class="hidden">
                    </div>

                    <span class="block text-[11px] text-slate-400 mb-1.5">أو اختر رمزاً تعبيرياً (Emoji):</span>
                    <div class="grid grid-cols-6 gap-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800">
                        <label class="cursor-pointer"><input type="radio" name="editAvatar" value="🚀" class="hidden peer"><span class="w-full aspect-square rounded-lg flex items-center justify-center text-lg bg-slate-900 border border-transparent peer-checked:bg-cyan-500/20 peer-checked:border-cyan-400 transition-all">🚀</span></label>
                        <label class="cursor-pointer"><input type="radio" name="editAvatar" value="⚡" class="hidden peer"><span class="w-full aspect-square rounded-lg flex items-center justify-center text-lg bg-slate-900 border border-transparent peer-checked:bg-cyan-500/20 peer-checked:border-cyan-400 transition-all">⚡</span></label>
                        <label class="cursor-pointer"><input type="radio" name="editAvatar" value="🧠" class="hidden peer"><span class="w-full aspect-square rounded-lg flex items-center justify-center text-lg bg-slate-900 border border-transparent peer-checked:bg-cyan-500/20 peer-checked:border-cyan-400 transition-all">🧠</span></label>
                        <label class="cursor-pointer"><input type="radio" name="editAvatar" value="👑" class="hidden peer"><span class="w-full aspect-square rounded-lg flex items-center justify-center text-lg bg-slate-900 border border-transparent peer-checked:bg-cyan-500/20 peer-checked:border-cyan-400 transition-all">👑</span></label>
                        <label class="cursor-pointer"><input type="radio" name="editAvatar" value="🔥" class="hidden peer"><span class="w-full aspect-square rounded-lg flex items-center justify-center text-lg bg-slate-900 border border-transparent peer-checked:bg-cyan-500/20 peer-checked:border-cyan-400 transition-all">🔥</span></label>
                        <label class="cursor-pointer"><input type="radio" name="editAvatar" value="🕶️" class="hidden peer"><span class="w-full aspect-square rounded-lg flex items-center justify-center text-lg bg-slate-900 border border-transparent peer-checked:bg-cyan-500/20 peer-checked:border-cyan-400 transition-all">🕶️</span></label>
                    </div>
                </div>

                <div class="pt-2 flex gap-2">
                    <button type="button" onclick="logoutCurrentUser()" class="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-xs transition-all">
                        تسجيل الخروج 🚪
                    </button>
                    <button type="submit" class="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all">
                        حفظ التعديلات 💾
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- 11. CONNECT TO HOST MODAL -->
    <div id="connectHostModal" class="hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <div class="glass-panel-elevated rounded-3xl p-6 max-w-md w-full border border-white/10 relative text-right">
            <button onclick="hideModal('connectHostModal')" class="absolute top-4 left-4 text-slate-400 hover:text-white">✕</button>
            <div class="text-center mb-4">
                <span class="text-4xl block mb-2">🔗</span>
                <h3 class="text-lg font-black text-white">الاتصال بسيرفر الفصل الرئيسي</h3>
                <p class="text-xs text-slate-400 mt-1">يجب أن يكون جميع الطلاب متصلين بنفس الـ IP الخاص بسيرفر الأدمن لتروا بعضكم وتتحدثوا معاً!</p>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1">عنوان IP سيرفر الأدمن / المضيف:</label>
                    <input type="text" id="targetHostIpInput" placeholder="مثال: 192.168.20.54" class="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none text-left" dir="ltr">
                </div>

                <div class="p-3 bg-slate-950/60 rounded-xl border border-white/5 text-[11px] text-slate-400 space-y-1">
                    <p>💡 <b class="text-white">كيف تعرف IP السيرفر؟</b></p>
                    <p>انظر إلى شاشة جهاز زميلك (الأدمن) الذي شغل السيرفر عنده، ستجد الـ IP مكتوباً في أعلى الشاشة أو في الترمينال (مثلاً: <span class="text-cyan-400 font-mono font-bold">192.168.20.54</span>).</p>
                </div>

                <button onclick="connectToEnteredHost()" class="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 font-black text-sm transition-all shadow-lg">
                    اتصال ودخول المنصة فوراً 🚀
                </button>
            </div>
        </div>
    </div>

    <!-- 🎵 SYNCHRONIZED CLASSROOM MUSIC / RADIO BAR 🎵 -->
    <div id="classroomMusicBar" class="hidden fixed bottom-4 inset-x-4 max-w-xl mx-auto bg-slate-900/95 backdrop-blur-xl border border-pink-500/30 rounded-2xl p-2.5 shadow-2xl shadow-pink-500/15 z-40 transition-all duration-300 flex flex-col">
        <div class="flex items-center justify-between gap-3">
            <!-- Track Info & Cover -->
            <div class="flex items-center gap-2.5 min-w-0">
                <div id="radioCoverWrapper" class="relative w-11 h-11 rounded-xl bg-slate-800 border border-white/10 overflow-hidden shrink-0 shadow-md flex items-center justify-center text-xl">
                    <span id="radioDefaultCover" class="animate-spin" style="animation-duration: 4s;">💿</span>
                </div>
                <div class="min-w-0">
                    <h4 id="radioTrackTitle" class="text-xs font-bold text-white truncate max-w-[150px] sm:max-w-xs">اسم الأغنية</h4>
                    <p id="radioTrackArtist" class="text-micro text-pink-400 truncate">الفنان • دي جي الفصل 🎧</p>
                </div>
            </div>

            <!-- Playback Controls -->
            <div class="flex items-center gap-1.5 shrink-0">
                <a id="quranExternalLinkBtn" href="https://www.holyquranradio.com/" target="_blank" rel="noopener noreferrer" class="hidden px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all shrink-0 flex items-center gap-1 shadow-sm" title="فتح موقع إذاعة القرآن الكريم المباشر holyquranradio.com">
                    <span>📻 holyquranradio.com ↗</span>
                </a>
                <button id="radioPlayPauseBtn" onclick="toggleRadioPlayPause()" class="w-9 h-9 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white flex items-center justify-center font-bold shadow-md shadow-pink-500/30 transition-all text-sm">
                    <span id="radioPlayIcon">▶</span>
                </button>
                <button onclick="openMusicModal()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-xs font-bold transition-all" title="فتح مكتبة الأغاني">
                    <span>🎵</span>
                    <span>المكتبة</span>
                </button>
                <button onclick="closeRadioBar()" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs" title="إيقاف ومغادرة الراديو">
                    ✕
                </button>
            </div>
        </div>

        <!-- Progress Bar & Scrubbing -->
        <div class="mt-2 flex items-center gap-2 px-1">
            <span id="radioCurrentTime" class="text-micro font-mono text-slate-400 shrink-0">0:00</span>
            <input type="range" id="radioProgressBar" min="0" max="100" value="0" step="0.5" oninput="handleRadioProgressInput(this.value)" class="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500">
            <span id="radioTotalDuration" class="text-micro font-mono text-slate-400 shrink-0">0:00</span>
        </div>
        <audio id="classroomAudioElement" preload="auto" class="hidden"></audio>
    </div>

    <!-- 🎵 MUSIC AUTOPLAY UNLOCK BANNER (If browser blocked background audio) -->
    <div id="musicAutoplayUnlockBanner" class="hidden fixed bottom-24 inset-x-4 max-w-sm mx-auto z-50 glass-panel-elevated rounded-2xl p-3 border border-pink-500/40 text-xs font-bold text-white shadow-2xl flex items-center justify-between gap-3 animate-bounce cursor-pointer" onclick="unlockAudioAutoplay()">
        <div class="flex items-center gap-2 min-w-0">
            <span class="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping shrink-0"></span>
            <span id="musicAutoplayTrackTitle" class="truncate text-pink-200">أغنية الفصل شغالة!</span>
        </div>
        <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black text-xs shrink-0 shadow">
            <i data-lucide="volume-2" class="w-[14px] h-[14px]"></i> تشغيل الصوت
        </button>
    </div>

    <!-- 📻 CAIRO HOLY QURAN RADIO LIVE HUB MODAL (holyquranradio.com) -->
    <div id="holyQuranRadioModal" class="hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
        <div class="glass-panel-elevated rounded-3xl p-5 sm:p-6 max-w-lg w-full border border-amber-500/40 shadow-2xl flex flex-col max-h-[90vh] relative bg-slate-950/95">
            <!-- Modal Header -->
            <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-inner">
                        <i data-lucide="book-open" class="w-5 h-5 text-amber-300"></i>
                    </div>
                    <div>
                        <h3 class="text-sm sm:text-base font-black text-white">مكتبة القرآن الكريم</h3>
                        <p class="text-[11px] text-amber-400/80">تلاوات كاملة محفوظة محليًا — تشتغل بالتزامن على كل أجهزة الفصل</p>
                    </div>
                </div>
                <button type="button" onclick="hideModal('holyQuranRadioModal')" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs shrink-0">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>

            <!-- Now Broadcasting Banner -->
            <div id="quranLibraryNowPlaying" class="hidden mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0"></span>
                    <span id="quranLibraryNowPlayingText" class="text-xs font-bold text-amber-300 truncate">--</span>
                </div>
                <button type="button" onclick="stopQuranLibraryBroadcast()" class="shrink-0 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-micro font-bold flex items-center gap-1">
                    <i data-lucide="square" class="w-3 h-3"></i> إيقاف
                </button>
            </div>

            <!-- Reciter Picker -->
            <label class="block text-[11px] font-bold text-slate-300 mb-1.5">اختر القارئ</label>
            <div id="quranReciterChips" class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-2 mb-3">
                <!-- Populated dynamically -->
            </div>

            <!-- Surah Picker -->
            <label class="block text-[11px] font-bold text-slate-300 mb-1.5">اختر السورة</label>
            <select id="quranSurahSelect" class="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none mb-4">
                <!-- Populated dynamically -->
            </select>

            <!-- Actions -->
            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                <button type="button" onclick="broadcastQuranLibrarySelection()" class="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition">
                    <i data-lucide="radio" class="w-[14px] h-[14px]"></i>
                    <span>بث لكل الفصل</span>
                </button>
                <button type="button" onclick="playQuranLibraryLocalOnly()" class="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition">
                    <i data-lucide="headphones" class="w-[14px] h-[14px]"></i>
                    <span>تشغيل عندي بس</span>
                </button>
            </div>
        </div>
    </div>

    <!-- 🎵 CLASSROOM LOCAL MUSIC LIBRARY & JUKEBOX MODAL (100% LAN & ONLINE STREAM) -->
    <div id="musicSearchModal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
        <div class="glass-panel-elevated rounded-3xl p-5 max-w-lg w-full border border-pink-500/30 flex flex-col max-h-[88vh] shadow-2xl relative">
            <!-- Modal Header -->
            <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">📻</span>
                    <div>
                        <h3 class="text-sm font-bold text-white flex items-center gap-1.5">
                            <span>راديو وموسيقى نؤطة</span>
                            <span class="text-micro px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">بث متزامن للفصل ⚡</span>
                        </h3>
                        <p class="text-micro text-slate-400">ابحث عن أي أغنية أونلاين أو شغل من مكتبة المعمل • صوت متزامن للكل!</p>
                    </div>
                </div>
                <button onclick="hideModal('musicSearchModal')" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs">✕</button>
            </div>

            <!-- Tabs Navigation -->
            <!-- Featured Quran Library Card -->
            <div class="mb-3 p-3 rounded-2xl bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/30 flex items-center justify-between gap-3 shadow-md shrink-0">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                        <i data-lucide="book-open" class="w-4 h-4 text-amber-300"></i>
                    </div>
                    <div class="min-w-0">
                        <h4 class="text-xs font-bold text-white truncate">مكتبة القرآن الكريم</h4>
                        <p class="text-micro text-slate-400 truncate">تلاوات كاملة لعدة قراء • بث متزامن لكل الفصل بنقرة واحدة</p>
                    </div>
                </div>
                <button type="button" onclick="toggleBroadcastQuranRadio()" class="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-sm shrink-0 flex items-center gap-1">
                    <i data-lucide="radio" class="w-[13px] h-[13px]"></i>
                    <span id="modalQuranRadioBtnText">فتح المكتبة</span>
                </button>
            </div>

            <div class="flex items-center gap-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mb-3 shrink-0">
                <button type="button" id="onlineMusicTabBtn" onclick="switchMusicModalTab('online')" class="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-400 border border-pink-500/40 shadow-sm">
                    <span>🌐</span>
                    <span>بحث أونلاين</span>
                    <span class="text-micro px-1 py-0.2 rounded-full bg-pink-500/30 text-white font-mono">جديد</span>
                </button>
                <button type="button" id="localMusicTabBtn" onclick="switchMusicModalTab('local')" class="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-white border border-transparent">
                    <span>📁</span>
                    <span>مكتبة الفصل</span>
                    <span id="localTabCountBadge" class="text-micro px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">0</span>
                </button>
            </div>

            <!-- Tab 1: Online Music Search Panel -->
            <div id="onlineMusicTabPanel" class="flex flex-col flex-1 min-h-0 space-y-2.5">
                <!-- Online Search Form -->
                <div class="relative">
                    <input type="text" id="onlineMusicSearchInput" onkeydown="if(event.key==='Enter') searchOnlineMusic(this.value)" placeholder="ابحث عن أي أغنية أو فنان أونلاين (عمرو دياب، ويجز، كايروكي...)" class="w-full bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-xl pr-9 pl-16 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all">
                    <span class="absolute right-3 top-3 text-slate-400 text-xs">🔍</span>
                    <button type="button" onclick="searchOnlineMusic(document.getElementById('onlineMusicSearchInput').value)" class="absolute left-1.5 top-1.5 px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500 text-pink-300 hover:text-white rounded-lg text-micro font-bold transition-all">
                        بحث
                    </button>
                </div>

                <!-- Fast Suggestion Pills -->
                <div class="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar shrink-0 text-micro">
                    <span class="text-slate-500 font-bold shrink-0">اقتراحات:</span>
                    <button type="button" onclick="quickSearchOnline('عمرو دياب')" class="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 hover:border-pink-500 text-slate-300 hover:text-pink-300 shrink-0 transition">🔥 عمرو دياب</button>
                    <button type="button" onclick="quickSearchOnline('ويجز')" class="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 hover:border-pink-500 text-slate-300 hover:text-pink-300 shrink-0 transition">⚡ ويجز</button>
                    <button type="button" onclick="quickSearchOnline('كايروكي')" class="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 hover:border-pink-500 text-slate-300 hover:text-pink-300 shrink-0 transition">🎸 كايروكي</button>
                    <button type="button" onclick="quickSearchOnline('تامر حسني')" class="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 hover:border-pink-500 text-slate-300 hover:text-pink-300 shrink-0 transition">🎤 تامر حسني</button>
                    <button type="button" onclick="quickSearchOnline('شيرين')" class="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 hover:border-pink-500 text-slate-300 hover:text-pink-300 shrink-0 transition">✨ شيرين</button>
                </div>

                <!-- Online Results Container -->
                <div id="onlineMusicResultsContainer" class="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[220px]">
                    <div class="text-center py-10 text-slate-500">
                        <span class="text-4xl block mb-2">🌐</span>
                        <p class="text-xs font-bold text-slate-400">ابحث عن أي أغنية أونلاين لتشغيلها لجميع الطلاب فوراً!</p>
                        <p class="text-micro text-slate-500 mt-1">يتم سحب الأغنية وتوزيعها تلقائياً عبر شبكة المعمل بدون حجب ⚡</p>
                    </div>
                </div>
            </div>

            <!-- Tab 2: Local Classroom Library Panel -->
            <div id="localMusicTabPanel" class="hidden flex flex-col flex-1 min-h-0 space-y-2.5">
                <!-- Upload Song Box -->
                <div class="p-3 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 border border-pink-500/30 flex items-center justify-between gap-3 shrink-0">
                    <div class="min-w-0">
                        <h4 class="text-xs font-bold text-white flex items-center gap-1">
                            <span>📁</span>
                            <span>عندك أغنية على جهازك أو فلاشة؟</span>
                        </h4>
                        <p class="text-micro text-slate-400">ارفع أي ملف (MP3 / WAV / M4A) وهيشتغل فوراً لكل زمايلك في الفصل!</p>
                    </div>
                    <button type="button" onclick="document.getElementById('radioAudioFileInput').click()" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white text-xs font-black shadow-lg shadow-pink-500/20 transition-all shrink-0 flex items-center gap-1.5">
                        <span>➕</span>
                        <span>رفع أغنية</span>
                    </button>
                    <input type="file" id="radioAudioFileInput" accept="audio/*" class="hidden" onchange="handleRadioFileUpload(this.files[0])">
                </div>

                <!-- Local Search Form -->
                <div class="relative">
                    <input type="text" id="musicSearchInput" oninput="handleMusicSearchInput(this.value)" placeholder="ابحث في الأغاني المحفوظة بالفصل..." class="w-full bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all">
                    <span class="absolute right-3 top-2.5 text-slate-400 text-xs">🔍</span>
                </div>

                <!-- Local Library Tracks Count & Refresh -->
                <div class="flex items-center justify-between px-1 text-[11px] text-slate-400 shrink-0">
                    <span id="musicLibraryCountText">الأغاني المحفوظة بالفصل</span>
                    <button type="button" onclick="loadMusicLibrary()" class="text-cyan-400 hover:text-white transition flex items-center gap-1">
                        <span>🔄</span>
                        <span>تحديث</span>
                    </button>
                </div>

                <!-- Local Results Container -->
                <div id="musicResultsContainer" class="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[220px]">
                    <div class="text-center py-10 text-slate-500">
                        <span class="text-4xl block mb-2">🎧</span>
                        <p class="text-xs font-bold">جاري تحميل مكتبة موسيقى الفصل...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 👥 CREATE GROUP MODAL -->
    <div id="createGroupModal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
        <div class="glass-panel-elevated rounded-3xl p-5 max-w-md w-full border border-purple-500/30 flex flex-col max-h-[90vh] shadow-2xl relative">
            <!-- Modal Header -->
            <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">👥</span>
                    <div>
                        <h3 class="text-sm font-bold text-white flex items-center gap-1.5">
                            <span>إنشاء جروب جديد</span>
                            <span class="text-micro px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">خاص بالفصل ⚡</span>
                        </h3>
                        <p class="text-micro text-slate-400">اجمع شلتك أو فريقك في شات مشترك!</p>
                    </div>
                </div>
                <button onclick="hideModal('createGroupModal')" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs">✕</button>
            </div>

            <form id="createGroupForm" onsubmit="handleCreateGroupSubmit(event)" class="flex flex-col flex-1 min-h-0 space-y-3">
                <!-- Group Name -->
                <div>
                    <label class="block text-[11px] font-bold text-slate-300 mb-1">اسم الجروب *</label>
                    <input type="text" id="createGroupNameInput" required maxlength="40" placeholder="مثلاً: شلة الدحيحة 🤓، فريق الفيزياء ⚡، بنش الأخير..." class="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all">
                </div>

                <!-- Group Icon Selector -->
                <div>
                    <label class="block text-[11px] font-bold text-slate-300 mb-1">أيقونة الجروب</label>
                    <div class="flex items-center gap-2">
                        <input type="text" id="createGroupIconInput" value="👥" maxlength="4" class="w-12 h-10 text-center text-xl bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-purple-500 text-white shrink-0">
                        <div class="flex items-center gap-1 overflow-x-auto py-1 custom-scrollbar flex-1">
                            <button type="button" onclick="setGroupIcon('👥')" class="px-2 py-1 bg-slate-800 hover:bg-purple-500/30 rounded-lg text-sm">👥</button>
                            <button type="button" onclick="setGroupIcon('🚀')" class="px-2 py-1 bg-slate-800 hover:bg-purple-500/30 rounded-lg text-sm">🚀</button>
                            <button type="button" onclick="setGroupIcon('💻')" class="px-2 py-1 bg-slate-800 hover:bg-purple-500/30 rounded-lg text-sm">💻</button>
                            <button type="button" onclick="setGroupIcon('⚡')" class="px-2 py-1 bg-slate-800 hover:bg-purple-500/30 rounded-lg text-sm">⚡</button>
                            <button type="button" onclick="setGroupIcon('🎮')" class="px-2 py-1 bg-slate-800 hover:bg-purple-500/30 rounded-lg text-sm">🎮</button>
                            <button type="button" onclick="setGroupIcon('🍕')" class="px-2 py-1 bg-slate-800 hover:bg-purple-500/30 rounded-lg text-sm">🍕</button>
                            <button type="button" onclick="setGroupIcon('🔥')" class="px-2 py-1 bg-slate-800 hover:bg-purple-500/30 rounded-lg text-sm">🔥</button>
                            <button type="button" onclick="setGroupIcon('👑')" class="px-2 py-1 bg-slate-800 hover:bg-purple-500/30 rounded-lg text-sm">👑</button>
                            <button type="button" onclick="setGroupIcon('📚')" class="px-2 py-1 bg-slate-800 hover:bg-purple-500/30 rounded-lg text-sm">📚</button>
                            <button type="button" onclick="setGroupIcon('🎯')" class="px-2 py-1 bg-slate-800 hover:bg-purple-500/30 rounded-lg text-sm">🎯</button>
                        </div>
                    </div>
                </div>

                <!-- Group Description -->
                <div>
                    <label class="block text-[11px] font-bold text-slate-300 mb-1">وصف الجروب (اختياري)</label>
                    <input type="text" id="createGroupDescInput" maxlength="100" placeholder="عن ماذا يتحدث هذا الجروب؟" class="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all">
                </div>

                <!-- Select Members -->
                <div class="flex-1 flex flex-col min-h-0">
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                            <span>اختيار الأعضاء</span>
                            <span id="selectedMembersCountBadge" class="text-micro px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-bold">0 مختار</span>
                        </label>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="toggleSelectAllGroupMembers()" id="selectAllMembersBtn" class="text-micro text-cyan-400 hover:underline">تحديد الكل</button>
                        </div>
                    </div>

                    <!-- Search filter for members -->
                    <input type="text" id="groupMemberSearchInput" oninput="filterGroupMembersList(this.value)" placeholder="ابحث عن زميل..." class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 rounded-xl px-3 py-1.5 text-[11px] text-white placeholder-slate-500 outline-none mb-1.5">

                    <!-- Members Checkboxes Container -->
                    <div id="groupMembersSelectionContainer" class="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar max-h-44 bg-slate-950/40 p-2 rounded-2xl border border-white/5">
                        <!-- Dynamically populated -->
                    </div>
                </div>

                <!-- Submit Button -->
                <div class="pt-2 border-t border-white/10 flex items-center justify-end gap-2">
                    <button type="button" onclick="hideModal('createGroupModal')" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition">
                        إلغاء
                    </button>
                    <button type="submit" id="submitCreateGroupBtn" class="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 hover:from-purple-400 hover:to-pink-400 text-white text-xs font-black shadow-lg shadow-purple-500/20 transition-all flex items-center gap-1.5">
                        <span>إنشاء الجروب 🚀</span>
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- 👥 GROUP MEMBERS MODAL -->
    <div id="groupMembersModal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
        <div class="glass-panel-elevated rounded-3xl p-5 max-w-sm w-full border border-purple-500/30 flex flex-col max-h-[80vh] shadow-2xl relative">
            <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div class="flex items-center gap-2">
                    <span id="groupInfoModalIcon" class="text-2xl">👥</span>
                    <div>
                        <h3 id="groupInfoModalTitle" class="text-sm font-bold text-white">أعضاء الجروب</h3>
                        <p id="groupInfoModalDesc" class="text-micro text-slate-400"></p>
                    </div>
                </div>
                <button onclick="hideModal('groupMembersModal')" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs">✕</button>
            </div>

            <div id="groupMembersListModalContainer" class="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                <!-- Dynamically populated -->
            </div>
        </div>
    </div>

    <!-- 📩 GROUP JOIN REQUESTS MODAL (Creator / Admin only) -->
    <div id="groupJoinRequestsModal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
        <div class="glass-panel-elevated rounded-3xl p-5 max-w-sm w-full border border-amber-500/30 flex flex-col max-h-[80vh] shadow-2xl relative">
            <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">📩</span>
                    <div>
                        <h3 class="text-sm font-bold text-white">طلبات الانضمام للجروب</h3>
                        <p id="groupJoinRequestsSubtitle" class="text-micro text-slate-400">وافق أو ارفض طلبات الزملاء لدخول الجروب</p>
                    </div>
                </div>
                <button onclick="hideModal('groupJoinRequestsModal')" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs">✕</button>
            </div>

            <div id="groupJoinRequestsListContainer" class="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                <!-- Dynamically populated requests -->
            </div>
        </div>
    </div>

    <!-- 🔒 STUDENT FULLSCREEN LOCK OVERLAY (When locked by Teacher via NetSupport) -->
    <div id="studentLockScreenOverlay" class="hidden fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none">
        <div class="relative mb-6">
            <div class="w-24 h-24 rounded-3xl bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center text-5xl shadow-2xl shadow-red-500/20 animate-pulse">
                🔒
            </div>
            <span class="absolute -top-1 -right-1 flex h-4 w-4">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
            </span>
        </div>
        <h2 class="text-2xl font-black text-white mb-2">تم قفل الشاشة بواسطة مشرف المعمل!</h2>
        <p id="studentLockReasonText" class="text-xs sm:text-sm text-red-300 font-bold mb-6 max-w-md bg-red-500/10 p-3.5 rounded-2xl border border-red-500/20 leading-relaxed">
            ⚠️ الأستاذ قفل الأجهزة حالياً للشرح. يرجى الانتباه للسبورة وعدم لمس الجهاز!
        </p>
        <div class="p-3 bg-slate-900/80 rounded-2xl border border-white/5 text-[11px] text-slate-400 font-mono">
            DEVICE LOCKED BY TEACHER • NETSUPPORT SECURITY
        </div>
    </div>

    <!-- ⚠️ STUDENT DIRECT WARNING MODAL -->
    <div id="studentDirectWarningModal" class="hidden fixed inset-0 z-[95] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div class="glass-panel-elevated rounded-3xl p-6 max-w-sm w-full border border-amber-500/50 text-center shadow-2xl relative">
            <span class="text-4xl block mb-2 animate-bounce">⚠️</span>
            <h3 id="studentDirectWarningTitle" class="text-base font-black text-amber-400 mb-2">تنبيه مباشر من الأستاذ!</h3>
            <p id="studentDirectWarningMsg" class="text-xs text-white font-bold leading-relaxed mb-4 bg-slate-950 p-3.5 rounded-xl border border-white/10"></p>
            <p id="studentDirectWarningTime" class="text-micro text-slate-400 mb-3"></p>
            <button onclick="hideModal('studentDirectWarningModal')" class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition">
                علم، مفهوم يا أستاذ 🫡
            </button>
        </div>
    </div>

    <!-- 🖥️ NETSUPPORT CLASSROOM LAB MONITOR MODAL (Admin Only) -->
    <div id="netSupportModal" class="hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
        <div class="glass-panel-elevated rounded-3xl p-4 sm:p-6 max-w-6xl w-full border border-cyan-500/40 flex flex-col h-[92vh] shadow-2xl relative">
            <!-- Modal Header -->
            <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10 mb-3 shrink-0">
                <div class="flex items-center gap-2.5">
                    <div class="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xl text-cyan-400 shadow-md">
                        🖥️
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h3 class="text-sm sm:text-base font-black text-white">مراقبة وتحكم معمل الفصل (NetSupport Live)</h3>
                            <span class="text-micro px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">تحكم كامل ⚡</span>
                        </div>
                        <p class="text-micro sm:text-xs text-slate-400">شاهد ما يدور على شاشة كل جهاز في المعمل وتحكم فيها كـ Show عادي!</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="openNetSupportAgentGuideModal()" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5" title="تشغيل برنامج مراقبة سطح مكتب الويندوز">
                        <span>📥</span>
                        <span class="hidden sm:inline">تشغيل عميل الويندوز (Agent)</span>
                    </button>
                    <button onclick="refreshNetSupportDevices()" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition flex items-center gap-1" title="تحديث الأجهزة">
                        <span>🔄</span>
                        <span class="hidden sm:inline">تحديث</span>
                    </button>
                    <button onclick="hideModal('netSupportModal')" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs">✕</button>
                </div>
            </div>

            <!-- Lab Global Control Toolbar -->
            <div class="bg-slate-950/80 p-2.5 rounded-2xl border border-white/5 mb-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div class="flex items-center gap-3 text-xs text-slate-300">
                    <div class="flex items-center gap-1.5">
                        <span class="text-slate-400">الأجهزة المتصلة:</span>
                        <span id="netSupportStatsTotal" class="font-mono font-bold text-cyan-400">0</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="text-slate-400">شاشات حية:</span>
                        <span id="netSupportStatsScreens" class="font-mono font-bold text-emerald-400">0</span>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 flex-wrap">
                    <button onclick="adminNetSupportGlobalAction('lock_all')" class="px-2.5 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                        <span>🔒 قفل كل المعمل</span>
                    </button>
                    <button onclick="adminNetSupportGlobalAction('unlock_all')" class="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                        <span>🔓 فتح كل الشاشات</span>
                    </button>
                    <button onclick="adminNetSupportGlobalAction('stealth_all')" class="px-2.5 py-1 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                        <span>📚 تمويه للكل</span>
                    </button>
                    <button onclick="adminNetSupportGlobalAction('message_all')" class="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                        <span>💬 رسالة للكل</span>
                    </button>
                </div>
            </div>

            <!-- NetSupport Devices Grid Container -->
            <div id="netSupportGridContainer" class="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-1 custom-scrollbar">
                <!-- Dynamically populated student screen cards -->
            </div>
        </div>
    </div>

    <!-- 🖥️ NETSUPPORT FULLSCREEN LIVE SHOW MODAL -->
    <div id="netSupportShowModal" class="hidden fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
        <div class="glass-panel-elevated rounded-3xl p-4 max-w-5xl w-full border border-cyan-500/40 flex flex-col h-[90vh] shadow-2xl relative">
            <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-2 shrink-0">
                <div class="flex items-center gap-3">
                    <div id="netSupportShowAvatar" class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm overflow-hidden">🖥️</div>
                    <div>
                        <h4 id="netSupportShowTitle" class="text-sm font-bold text-white">شاشة الطالب</h4>
                        <p id="netSupportShowSubtitle" class="text-micro text-slate-400 font-mono"></p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button id="netSupportShowLockBtn" onclick="toggleCurrentShowLock()" class="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                        <span>🔒</span>
                        <span id="netSupportShowLockLabel">قفل الشاشة</span>
                    </button>
                    <button onclick="sendMsgToCurrentShowDevice()" class="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                        <span>💬</span>
                        <span>إرسال تنبيه</span>
                    </button>
                    <button onclick="triggerAlarmCurrentShowDevice()" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                        <span>🔔</span>
                        <span>إنذار صوتي</span>
                    </button>
                    <button onclick="hideModal('netSupportShowModal')" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer">✕</button>
                </div>
            </div>

            <!-- Fullscreen Live Screen Frame -->
            <div class="flex-1 bg-black rounded-2xl overflow-hidden relative flex items-center justify-center border border-white/5">
                <img id="netSupportShowImage" src="" class="w-full h-full object-contain" alt="Live Screen Stream">
                <div id="netSupportShowPlaceholder" class="hidden absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                    <span class="text-4xl">🖥️</span>
                    <span>في انتظار وصول لقطة الشاشة من هذا الجهاز...</span>
                </div>
            </div>
        </div>
    </div>

        <!-- 📥 NETSUPPORT AGENT GUIDE MODAL -->
    <div id="netSupportAgentGuideModal" class="hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
        <div class="glass-panel-elevated rounded-3xl p-6 max-w-lg w-full border border-cyan-500/40 shadow-2xl relative">
            <button onclick="hideModal('netSupportAgentGuideModal')" class="absolute top-4 left-4 text-slate-400 hover:text-white text-base">✕</button>
            <div class="flex items-center gap-2.5 mb-3">
                <span class="text-2xl">🖥️</span>
                <div>
                    <h3 class="text-sm font-black text-white">مراقبة جهاز الطالب بالكامل (Windows Desktop)</h3>
                    <p class="text-[11px] text-cyan-300">رؤية سطح المكتب، الألعاب، والبرامج الخارجية بدون طلب إذن</p>
                </div>
            </div>
            <div class="space-y-3 text-xs text-slate-300">
                <div class="p-3 bg-slate-950/80 rounded-2xl border border-white/5 space-y-2">
                    <p class="font-bold text-white flex items-center gap-1.5">
                        <span class="text-emerald-400">⚡</span>
                        <span>طريقة التشغيل على جهاز أي طالب في المعمل:</span>
                    </p>
                    <ol class="list-decimal list-inside space-y-2 text-slate-300 text-[11px] leading-relaxed">
                        <li>شغّل ملف <span class="text-cyan-300 font-mono font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-cyan-500/30">install-student-agent.bat</span> على كمبيوتر الطالب مرة واحدة فقط.</li>
                        <li>سيثبت نفسه تلقائياً في بدء تشغيل الويندوز (Startup) ويعمل <strong>صامتاً في الخلفية</strong> بدون نافذة سوداء.</li>
                        <li>من اللحظة دي، ستظهر <strong>شاشة جهاز الطالب بالكامل</strong> (شات، ألعاب، برامج، سطح المكتب) في شبكة المعمل مباشرة وبدون ما تدوس "طلب بث"!</li>
                    </ol>
                </div>

                <div class="grid grid-cols-2 gap-2 pt-1">
                    <a href="/agent/install-student-agent.bat" download class="py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs text-center transition flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20">
                        <span>📥</span>
                        <span>تحميل مثبت العميل الصامت</span>
                    </a>
                    <a href="/agent/lab-agent.bat" download class="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs text-center border border-white/10 transition flex items-center justify-center gap-1.5">
                        <span>⚡</span>
                        <span>تحميل lab-agent.bat يدوي</span>
                    </a>
                </div>

                <div class="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-micro text-emerald-200">
                    💡 <strong>ملاحظة للمُعلم:</strong> ملف الـ Agent ده بيشتغل على <strong>كمبيوترات الطلاب في المعمل فقط</strong>، ومش محتاج تشغله على جهازك أنت يا غالي!
                </div>
            </div>
        </div>
    </div>

    <!-- 🕌 ALEXANDRIA PRAYER TIMES & SCHOOL TIMETABLE MODAL -->
    <div id="prayerTimesModal" class="hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
        <div class="glass-panel-elevated rounded-3xl p-5 sm:p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto custom-scrollbar border border-cyan-500/40 shadow-2xl relative bg-gradient-to-b from-slate-950 via-[#0a141c] to-cyan-950/25">
            <!-- Background Glow -->
            <div class="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>
            <div class="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

            <!-- Close Button -->
            <button onclick="hideModal('prayerTimesModal')" class="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer z-10">✕</button>

            <!-- Modal Tabs Switcher -->
            <div class="flex items-center gap-1.5 p-1 rounded-2xl bg-black/50 border border-white/10 mb-4 text-xs font-bold">
                <button id="tabBtnSchoolSchedule" onclick="switchTimetableTab('schedule')" class="flex-1 py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm cursor-pointer">
                    <span>🏫</span>
                    <span>جدول الحصص واليوم الدراسي</span>
                </button>
                <button id="tabBtnPrayerTimes" onclick="switchTimetableTab('prayers')" class="flex-1 py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer">
                    <span>🕌</span>
                    <span>مواقيت الصلاة (الإسكندرية)</span>
                </button>
            </div>

            <!-- TAB 1: SCHOOL SCHEDULE & PERIODS TABLE -->
            <div id="tabContentSchoolSchedule" class="space-y-3">
                <!-- Current Live Status Banner -->
                <div class="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-blue-950/60 border border-cyan-500/30">
                    <div class="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">🏫</span>
                            <div>
                                <span class="font-black text-white text-sm block" id="modalSchoolCurrentStatus">--</span>
                                <span class="text-micro text-slate-400" id="modalSchoolSessionInfo">الحصة 55 دقيقة • يبدأ اليوم 7:30 ص</span>
                            </div>
                        </div>
                        <span id="modalSchoolSessionTimer" class="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs border border-cyan-500/30">--</span>
                    </div>

                    <div class="grid grid-cols-3 gap-1.5 text-center font-mono text-micro">
                        <div class="p-2 rounded-xl bg-black/40 border border-white/5">
                            <span class="text-slate-400 text-micro block">☕ البريك (11:10)</span>
                            <strong id="modalSchoolBreakTimer" class="text-amber-300 text-xs block mt-0.5">--</strong>
                        </div>
                        <div class="p-2 rounded-xl bg-black/40 border border-white/5">
                            <span id="modalSchoolBionicHeader" class="text-slate-400 text-micro block">🔬 البايونيك (3:30)</span>
                            <strong id="modalSchoolBionicTimer" class="text-purple-300 text-xs block mt-0.5">--</strong>
                        </div>
                        <div class="p-2 rounded-xl bg-black/40 border border-white/5">
                            <span id="modalSchoolDismissalHeader" class="text-slate-400 text-micro block">🏠 المرواح (4:00)</span>
                            <strong id="modalSchoolDismissalTimer" class="text-emerald-300 text-xs block mt-0.5">--</strong>
                        </div>
                    </div>
                </div>

                <!-- Schedule Table Container -->
                <div class="rounded-2xl border border-white/10 overflow-hidden bg-slate-950/70 shadow-lg">
                    <div class="p-3 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2 font-bold text-white">
                            <span>📋</span>
                            <span>جدول مواعيد اليوم الدراسي بالتفصيل</span>
                        </div>
                        <span id="modalScheduleDayBadge" class="text-micro px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">اليوم الدراسي</span>
                    </div>

                    <!-- Dynamic Table Rows -->
                    <div id="modalScheduleRowsContainer" class="divide-y divide-white/5 text-xs">
                        <!-- Populated dynamically by updateSchoolScheduleUI -->
                    </div>
                </div>

                <!-- Notes & Rules Box -->
                <div class="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-[11px] text-amber-200">
                    <span class="text-lg shrink-0">💡</span>
                    <div class="leading-relaxed space-y-1">
                        <strong class="text-amber-300 block font-bold">قواعد توقيت اليوم الدراسي:</strong>
                        <div>• <strong>الحصص:</strong> 8 حصص دراسية، مدة كل حصة 55 دقيقة، البداية 7:30 صباحاً.</div>
                        <div>• <strong>البريك:</strong> يبدأ الساعة 11:10 صباحاً لمدة 40 دقيقة كاملة (حتى 11:50 صباحاً).</div>
                        <div>• <strong>البايونيك (Bionic):</strong> الساعة 3:30 عصراً لمدة 30 دقيقة (الأحد إلى الأربعاء فقط).</div>
                        <div>• <strong>المرواح:</strong> الساعة 4:00 عصراً (الأحد للأربعاء)، ويوم <strong>الخميس</strong> المرواح 3:30 عصراً فوراً بعد الحصة الثامنة (لا يوجد بايونيك).</div>
                    </div>
                </div>
            </div>

            <!-- TAB 2: ALEXANDRIA PRAYER TIMES -->
            <div id="tabContentPrayerTimes" class="hidden space-y-3">
                <!-- Modal Header -->
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl shadow-inner">
                        🕌
                    </div>
                    <div>
                        <div class="flex items-center gap-1.5">
                            <h3 class="text-base font-black text-white">مواقيت الصلاة في الإسكندرية</h3>
                            <span class="text-micro px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">مصر 🇪🇬</span>
                        </div>
                        <p id="modalAlexandriaFullDate" class="text-xs text-slate-400 mt-0.5">--</p>
                    </div>
                </div>

                <!-- Live Clock & Next Prayer Hero Box -->
                <div class="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900/80 border border-emerald-500/30 text-center relative overflow-hidden">
                    <div class="text-[11px] font-bold text-emerald-300 mb-1 flex items-center justify-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>توقيت الإسكندرية الحي</span>
                    </div>
                    <div id="modalAlexandriaLiveClock" class="text-3xl sm:text-4xl font-mono font-black text-white tracking-wider my-1 drop-shadow">
                        --:--:--
                    </div>
                    <div class="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-white/10">
                        <span class="text-xs text-slate-300">الصلاة القادمة:</span>
                        <span id="modalNextPrayerName" class="text-xs font-bold text-amber-400 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30">--</span>
                        <span id="modalNextPrayerCountdown" class="text-xs font-mono font-bold text-cyan-300">باقي: --</span>
                    </div>
                </div>

                <!-- 6 Timings Table (Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha) -->
                <div class="space-y-1.5 text-xs">
                    <div id="modal_row_fajr" class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between transition-all">
                        <div class="flex items-center gap-2">
                            <span class="text-base">🌅</span>
                            <span class="font-bold text-white">صلاة الفجر</span>
                        </div>
                        <span id="modal_time_fajr" class="font-mono font-bold text-slate-200">--:--</span>
                    </div>
                    <div id="modal_row_sunrise" class="p-2.5 rounded-xl bg-slate-900/40 border border-white/5 flex items-center justify-between text-slate-400 transition-all">
                        <div class="flex items-center gap-2">
                            <span class="text-base">☀️</span>
                            <span>الشروق</span>
                        </div>
                        <span id="modal_time_sunrise" class="font-mono font-bold text-slate-400">--:--</span>
                    </div>
                    <div id="modal_row_dhuhr" class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between transition-all">
                        <div class="flex items-center gap-2">
                            <span class="text-base">☀️</span>
                            <span class="font-bold text-white">صلاة الظهر</span>
                        </div>
                        <span id="modal_time_dhuhr" class="font-mono font-bold text-slate-200">--:--</span>
                    </div>
                    <div id="modal_row_asr" class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between transition-all">
                        <div class="flex items-center gap-2">
                            <span class="text-base">🌤️</span>
                            <span class="font-bold text-white">صلاة العصر</span>
                        </div>
                        <span id="modal_time_asr" class="font-mono font-bold text-slate-200">--:--</span>
                    </div>
                    <div id="modal_row_maghrib" class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between transition-all">
                        <div class="flex items-center gap-2">
                            <span class="text-base">🌇</span>
                            <span class="font-bold text-white">صلاة المغرب</span>
                        </div>
                        <span id="modal_time_maghrib" class="font-mono font-bold text-slate-200">--:--</span>
                    </div>
                    <div id="modal_row_isha" class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between transition-all">
                        <div class="flex items-center gap-2">
                            <span class="text-base">🌙</span>
                            <span class="font-bold text-white">صلاة العشاء</span>
                        </div>
                        <span id="modal_time_isha" class="font-mono font-bold text-slate-200">--:--</span>
                    </div>
                </div>

                <!-- Adhan Du'a Footer Card -->
                <div class="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <p class="text-[11px] text-emerald-200 leading-relaxed font-serif">
                        «اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ القَائِمَةِ، آتِ مُحَمَّداً الوَسِيلَةَ وَالفَضِيلَةَ، وَابْعَثْهُ مَقَاماً مَحْمُوداً الَّذِي وَعَدْتَهُ»
                    </p>
                </div>

                <!-- Tasbeeh Quick Button in Prayer Modal -->
                <button onclick="hideModal('prayerTimesModal'); openTasbeehModal();" class="w-full mt-1 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10">
                    <span>📿</span>
                    <span>فتح السبحة الإلكترونية للأذكار</span>
                    <span>✨</span>
                </button>
            </div>
        </div>
    </div>

    <!-- 📿 DIGITAL TASBEEH MODAL -->
    <div id="tasbeehModal" class="hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
        <div class="glass-panel-elevated rounded-3xl p-5 sm:p-6 max-w-md w-full border border-amber-500/40 shadow-2xl relative overflow-hidden bg-gradient-to-b from-slate-950 via-[#10141e] to-amber-950/25">
            <!-- Glow background -->
            <div class="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>
            <div class="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

            <!-- Top bar -->
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <i data-lucide="circle-dot-dashed" class="w-6 h-6 text-amber-300"></i>
                    <div>
                        <h3 class="text-sm font-black text-white">السبحة الإلكترونية</h3>
                        <p class="text-micro text-amber-300/80">أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button id="tasbeehSoundToggleBtn" onclick="toggleTasbeehSound()" class="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-slate-300 transition" title="تشغيل / كتم صوت خرزات السبحة">
                        <i id="tasbeehSoundIconOn" data-lucide="volume-2" class="w-4 h-4"></i>
                        <i id="tasbeehSoundIconOff" data-lucide="volume-x" class="hidden w-4 h-4"></i>
                    </button>
                    <button onclick="hideModal('tasbeehModal')" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer">✕</button>
                </div>
            </div>

            <!-- Classroom Collective Banner -->
            <div class="p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs mb-3 shadow-inner">
                <span class="text-[11px] text-amber-200 font-bold flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    <span>تسبيحات الفصل معاً:</span>
                </span>
                <span id="tasbeehClassroomTotal" class="font-mono font-black text-amber-300 text-sm">0</span>
            </div>

            <!-- Dhikr Selector Pills (Scrollable horizontally) -->
            <div id="tasbeehDhikrList" class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-2 mb-3">
                <!-- Dynamically populated pills -->
            </div>

            <!-- Big Circular Counter -->
            <div class="flex flex-col items-center justify-center my-2">
                <div id="tasbeehCounterCircle" onclick="incrementTasbeeh()" class="relative w-48 h-48 sm:w-52 sm:h-52 rounded-full cursor-pointer select-none group flex items-center justify-center transition-transform active:scale-95 shadow-2xl shadow-amber-500/10 bg-slate-950/60 border border-white/5">
                    <!-- SVG Progress Ring -->
                    <svg class="w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 160 160">
                        <circle cx="80" cy="80" r="70" stroke="currentColor" stroke-width="8" class="text-slate-800/80" fill="transparent" />
                        <circle id="tasbeehProgressCircle" cx="80" cy="80" r="70" stroke="currentColor" stroke-width="8" stroke-linecap="round" class="text-amber-400 transition-all duration-150" fill="transparent" stroke-dasharray="440" stroke-dashoffset="440" />
                    </svg>

                    <!-- Inside Circle Content -->
                    <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
                        <span id="tasbeehCurrentDhikrTitle" class="text-xs sm:text-sm font-bold text-amber-200 mb-1 leading-snug line-clamp-2 px-2">سُبْحَانَ اللَّهِ</span>
                        <span id="tasbeehCountDisplay" class="text-4xl sm:text-5xl font-black font-mono text-white tracking-wider my-1 drop-shadow-lg">0</span>
                        <div class="flex items-center gap-1 text-micro text-slate-400 font-mono">
                            <span>الهدف:</span>
                            <span id="tasbeehTargetDisplay" class="text-amber-300 font-bold">33</span>
                        </div>
                        <span class="text-micro text-slate-500 mt-1 opacity-70 group-hover:opacity-100 transition">اضغط هنا أو زر المسافة (Space)</span>
                    </div>
                </div>
            </div>

            <!-- Bottom Target Selector & Controls -->
            <div class="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-white/10 text-xs">
                <!-- Target buttons -->
                <div class="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/5">
                    <button onclick="setTasbeehTarget(33)" id="targetBtn_33" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 transition">33</button>
                    <button onclick="setTasbeehTarget(100)" id="targetBtn_100" class="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition">100</button>
                    <button onclick="setTasbeehTarget(0)" id="targetBtn_0" class="px-2 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition" title="عداد حر مفتوح">∞</button>
                </div>

                <!-- Cycle indicator -->
                <div class="text-[11px] text-slate-300 font-bold flex items-center gap-1">
                    <span>الدورة:</span>
                    <span id="tasbeehCycleCount" class="font-mono text-emerald-400 font-black">1</span>
                </div>

                <!-- Reset Button -->
                <button onclick="resetCurrentTasbeeh()" class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-red-500/20 hover:text-red-300 border border-white/10 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                    <span>🔄</span>
                    <span>تصفير</span>
                </button>
            </div>

            <!-- User Lifetime Stats Bar -->
            <div class="flex items-center justify-between text-micro text-slate-400 mt-2 px-1 font-mono">
                <span>اليوم: <strong id="tasbeehTodayCount" class="text-white">0</strong></span>
                <span>إجمالي تسبيحاتك: <strong id="tasbeehLifetimeCount" class="text-amber-300">0</strong></span>
            </div>

            <!-- Salawat Voice Selector & Classroom Trigger Box -->
            <div class="mt-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                <div class="flex items-center justify-between text-[11px]">
                    <span class="text-amber-300 font-bold flex items-center gap-1">
                        <span>🔊</span>
                        <span>صوت النطق الصوتي للصلوات (كل 5 دقائق ⏱️):</span>
                    </span>
                    <button onclick="testSalawatAudioVoice()" class="text-micro px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition cursor-pointer font-bold">
                        🔊 تجربة الصوت
                    </button>
                </div>

                <div class="grid grid-cols-3 gap-1 text-micro font-bold">
                    <button id="voiceOpt_voice1" onclick="selectSalawatVoice('voice1')" class="py-1 px-1.5 rounded-lg text-center transition bg-amber-500 text-slate-950 shadow-sm cursor-pointer border border-amber-400 font-bold">
                        بشري: صلِّ ع النبي
                    </button>
                    <button id="voiceOpt_voice2" onclick="selectSalawatVoice('voice2')" class="py-1 px-1.5 rounded-lg text-center transition bg-black/40 text-slate-300 hover:text-white cursor-pointer border border-white/5">
                        بشري: اللهم صلِّ
                    </button>
                    <button id="voiceOpt_voice3" onclick="selectSalawatVoice('voice3')" class="py-1 px-1.5 rounded-lg text-center transition bg-black/40 text-slate-300 hover:text-white cursor-pointer border border-white/5">
                        بشري: نداء
                    </button>
                </div>

                <button onclick="triggerClassroomSalawat()" class="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/25 via-emerald-500/25 to-amber-500/25 hover:from-amber-500/35 hover:to-emerald-500/35 border border-amber-500/40 text-amber-200 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md" title="إرسال نطق صوتي فوري لجميع الأجهزة في المعمل لنطقها في نفس اللحظة">
                    <span class="text-base">📢</span>
                    <span>إطلاق نطق "صلِّ على محمد ﷺ" في كل المعمل الآن</span>
                    <span class="text-xs">🔊</span>
                </button>
            </div>
        </div>
    </div>

    <!-- QUICK MATH CHALLENGE MODAL — live competitive mini-game -->
    <div id="mathGameModal" class="hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
        <div class="glass-panel-elevated rounded-3xl p-5 sm:p-6 max-w-md w-full border border-indigo-500/40 shadow-2xl relative bg-slate-950/95">
            <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shadow-inner">
                        <i data-lucide="zap" class="w-5 h-5 text-indigo-300"></i>
                    </div>
                    <div>
                        <h3 class="text-sm sm:text-base font-black text-white">تحدي الرياضيات السريع</h3>
                        <p class="text-[11px] text-indigo-400/80">أول واحد يجاوب صح ياخد النقطة — 8 أسئلة لكل جولة</p>
                    </div>
                </div>
                <button type="button" onclick="hideModal('mathGameModal')" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs shrink-0">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>

            <!-- Idle state -->
            <div id="mathGameIdleView">
                <p class="text-xs text-slate-400 mb-4 text-center">اضغط ابدأ وكل زملائك المتصلين هيلحقوا يلعبوا معاك فورًا.</p>
                <button type="button" onclick="startMathGame()" class="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 transition">
                    <i data-lucide="play" class="w-4 h-4"></i>
                    <span>ابدأ التحدي</span>
                </button>
            </div>

            <!-- Active question state -->
            <div id="mathGameQuestionView" class="hidden">
                <div class="flex items-center justify-between mb-3 text-micro text-slate-400 font-bold">
                    <span id="mathGameProgress">سؤال 1 / 8</span>
                    <span id="mathGameRoundResult" class="text-emerald-400"></span>
                </div>
                <div class="p-6 rounded-2xl bg-slate-900 border border-indigo-500/30 text-center mb-4">
                    <div id="mathGameQuestionText" class="text-4xl font-black text-white font-mono">-- + --</div>
                </div>
                <form onsubmit="submitMathAnswer(event)" class="flex items-center gap-2 mb-4">
                    <input type="number" id="mathGameAnswerInput" placeholder="إجابتك..." class="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none text-center font-mono" autocomplete="off">
                    <button type="submit" class="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm">إرسال</button>
                </form>
                <div id="mathGameLiveScores" class="space-y-1 max-h-32 overflow-y-auto custom-scrollbar"></div>
            </div>

            <!-- Finished state -->
            <div id="mathGameFinishedView" class="hidden">
                <div class="text-center mb-4">
                    <i data-lucide="trophy" class="w-10 h-10 text-amber-400 mx-auto mb-2"></i>
                    <h4 class="text-sm font-black text-white">انتهى التحدي!</h4>
                </div>
                <div id="mathGameFinalScores" class="space-y-1.5 mb-4"></div>
                <button type="button" onclick="startMathGame()" class="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs flex items-center justify-center gap-2">
                    <i data-lucide="rotate-ccw" class="w-[14px] h-[14px]"></i>
                    <span>تحدي جديد</span>
                </button>
            </div>
        </div>
    </div>

    <!-- 🕋 SYNCHRONIZED SALAWAT FLOATING BANNER -->
    <div id="globalSalawatBanner" class="hidden fixed top-12 inset-x-0 z-50 flex justify-center pointer-events-none px-3 transition-all duration-500 transform -translate-y-6 opacity-0">
        <div class="glass-panel-elevated rounded-3xl px-5 sm:px-7 py-3.5 border-2 border-amber-400/90 shadow-2xl shadow-amber-500/40 bg-gradient-to-r from-amber-950/95 via-slate-950/95 to-emerald-950/95 flex items-center gap-3 text-white pointer-events-auto">
            <span class="text-2xl animate-spin" style="animation-duration: 9s;">✨</span>
            <div class="text-center">
                <span class="text-[11px] font-bold text-amber-300 block mb-0.5">تذكير معمل الفصل الموحد • أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ</span>
                <span class="text-base sm:text-lg font-black text-white font-serif tracking-wide drop-shadow">ﷺ صَلِّ عَلَى مُحَمَّدٍ ﷺ</span>
            </div>
            <span class="text-2xl">🕌</span>
        </div>
    </div>

    <!-- 9. FLOATING NOTIFICATION PILL -->
    <div id="globalNotificationPill" class="hidden fixed bottom-5 left-5 z-50 glass-panel-elevated rounded-2xl px-4 py-2.5 border border-cyan-500/40 text-xs font-bold text-white shadow-2xl flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
        <span id="globalNotificationMsg">إشعار جديد</span>
    </div>

    <!-- Main Application Scripts -->
    <script src="/js/html2canvas.min.js"></script>
    <script src="/js/app.js?v=4.6.7"></script>
</body>
</html>

~~~~


### المصدر: public/js/app.js

~~~~js
// ==========================================
// 🚀 No2ta ("نؤطة") - Core Application Controller
// ==========================================

const STATE = {
    user: null,
    socket: null,
    users: [],
    onlineUserIds: new Set(),
    activeChat: { type: 'general', recipient: null, group: null },
    groups: [],
    activeSidebarTab: 'general',
    messages: [],
    stories: [],
    streaks: [],
    airdropFiles: [],
    networkInfo: {},
    disappearingSeconds: 0,
    isChatLocked: false,
    isStealthActive: false,
    localStealthSuppressed: false,
    voiceRecorder: {
        mediaRecorder: null,
        audioChunks: [],
        interval: null,
        seconds: 0
    },
    whiteboard: {
        canvas: null,
        ctx: null,
        drawing: false,
        lastX: 0,
        lastY: 0,
        color: '#06b6d4',
        brushSize: 3,
        mode: 'brush' // 'brush' | 'eraser'
    },
    codepad: {
        text: '',
        debounceTimer: null
    },
    screenShare: {
        isSharing: false,
        isViewing: false,
        localStream: null,
        peerConnections: new Map(), // viewerSocketId -> RTCPeerConnection
        viewerPeerConnection: null,
        activeShareInfo: null,
        rtcConfig: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        }
    },
    radio: {
        activeTrack: null,
        isPlaying: false,
        isSeeking: false,
        audioEl: null
    },
    netSupport: {
        devices: [],
        currentShowDeviceId: null,
        pollInterval: null,
        studentStreamInterval: null,
        studentMediaStream: null
    },
    pendingEditAvatarUrl: null,
    pendingAuthAvatarUrl: null
};

const MASTER_PASSWORD = '[REDACTED_SHARED_PASSWORD]';

function renderAvatarHTML(avatar, extraClasses = 'w-full h-full') {
    if (!avatar) return '<span>👤</span>';
    if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('/') || avatar.startsWith('data:image')) {
        return `<img src="${avatar}" class="${extraClasses} object-cover rounded-full" alt="Avatar" />`;
    }
    return `<span>${avatar}</span>`;
}

// DOM Ready Init
function renderIcons() {
    if (window.lucide) lucide.createIcons();
}

// ---------------------- Quick Math Challenge (live competitive mini-game) ----------------------
function startMathGame() {
    if (STATE.socket) STATE.socket.emit('math_game_start');
}

function submitMathAnswer(e) {
    e.preventDefault();
    const input = document.getElementById('mathGameAnswerInput');
    if (!input || !input.value.trim()) return;
    if (STATE.socket) {
        STATE.socket.emit('math_game_answer', {
            answer: input.value.trim(),
            nickname: STATE.user ? STATE.user.nickname : 'لاعب'
        });
    }
    input.value = '';
}

function renderMathGameScores(containerId, scores) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!scores || scores.length === 0) {
        el.innerHTML = `<p class="text-micro text-slate-500 text-center">لسه محدش سجل نقطة</p>`;
        return;
    }
    el.innerHTML = scores.map(([name, pts], i) => `
        <div class="flex items-center justify-between px-2.5 py-1.5 rounded-lg ${i === 0 ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-slate-900/60'} text-xs">
            <span class="font-bold text-slate-200">#${i + 1} ${escapeHtml(name)}</span>
            <span class="font-mono font-black text-indigo-300">${pts}</span>
        </div>
    `).join('');
}

function handleMathGameState(state) {
    const idleView = document.getElementById('mathGameIdleView');
    const questionView = document.getElementById('mathGameQuestionView');
    const finishedView = document.getElementById('mathGameFinishedView');
    if (!idleView || !questionView || !finishedView) return;

    if (state.status === 'question') {
        idleView.classList.add('hidden');
        finishedView.classList.add('hidden');
        questionView.classList.remove('hidden');
        document.getElementById('mathGameProgress').textContent = `سؤال ${state.index + 1} / ${state.total}`;
        document.getElementById('mathGameQuestionText').textContent = state.question;
        document.getElementById('mathGameRoundResult').textContent = '';
        renderMathGameScores('mathGameLiveScores', state.scores);
        const input = document.getElementById('mathGameAnswerInput');
        if (input) { input.value = ''; input.focus(); }
    } else if (state.status === 'finished') {
        idleView.classList.add('hidden');
        questionView.classList.add('hidden');
        finishedView.classList.remove('hidden');
        renderMathGameScores('mathGameFinalScores', state.scores);
    }
}

function handleMathGameRoundResult(data) {
    const resultEl = document.getElementById('mathGameRoundResult');
    if (!resultEl) return;
    resultEl.textContent = data.winner
        ? `${data.winner} جاوب صح! (${data.answer})`
        : `محدش جاوب في الوقت (${data.answer})`;
}

// ---------------------------------------------------------------
// Custom Dropdown — replaces the browser's native <select> popup
// (whose look can't be themed) with a styled list matching the app,
// while keeping the original <select> in the DOM (hidden) so every
// existing `select.value` read/`change` listener keeps working untouched.
// ---------------------------------------------------------------
function enhanceSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select || select.dataset.enhanced) return;
    select.dataset.enhanced = '1';
    select.classList.add('hidden');

    const wrap = document.createElement('div');
    wrap.className = 'relative';
    select.insertAdjacentElement('afterend', wrap);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = select.className.replace('hidden', '') + ' flex items-center justify-between gap-2 cursor-pointer';

    const triggerLabel = document.createElement('span');
    triggerLabel.className = 'truncate';
    const chevron = document.createElement('i');
    chevron.setAttribute('data-lucide', 'chevron-down');
    chevron.className = 'w-4 h-4 shrink-0 text-slate-400 transition-transform';
    trigger.appendChild(triggerLabel);
    trigger.appendChild(chevron);
    wrap.appendChild(trigger);

    const list = document.createElement('div');
    list.className = 'hidden absolute z-30 mt-1.5 w-full max-h-64 overflow-y-auto custom-scrollbar rounded-xl border border-slate-700 bg-slate-900 shadow-2xl py-1';
    wrap.appendChild(list);

    function renderOptions() {
        list.innerHTML = '';
        Array.from(select.options).forEach(opt => {
            const item = document.createElement('button');
            item.type = 'button';
            const active = opt.value === select.value;
            item.className = `w-full text-right px-3.5 py-2 text-sm transition-colors ${active ? 'bg-cyan-500/15 text-cyan-300 font-bold' : 'text-slate-200 hover:bg-slate-800'}`;
            item.textContent = opt.textContent;
            item.onclick = () => {
                select.value = opt.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                syncTriggerLabel();
                closeList();
            };
            list.appendChild(item);
        });
    }

    function syncTriggerLabel() {
        const selectedOpt = select.options[select.selectedIndex];
        triggerLabel.textContent = selectedOpt ? selectedOpt.textContent : '';
    }

    function closeList() {
        list.classList.add('hidden');
        chevron.classList.remove('rotate-180');
    }

    function openList() {
        renderOptions();
        list.classList.remove('hidden');
        chevron.classList.add('rotate-180');
        renderIcons();
    }

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (list.classList.contains('hidden')) openList(); else closeList();
    });
    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) closeList();
    });

    // If the underlying <select>'s options change later (populated dynamically),
    // refreshSelectLabel(selectId) keeps the visible trigger in sync.
    select._customSelectRefresh = () => { syncTriggerLabel(); if (!list.classList.contains('hidden')) renderOptions(); };

    syncTriggerLabel();
    renderIcons();
}

function refreshSelectLabel(selectId) {
    const select = document.getElementById(selectId);
    if (select && select._customSelectRefresh) select._customSelectRefresh();
}

document.addEventListener('DOMContentLoaded', async () => {
    renderIcons();
    enhanceSelect('snippetLanguageSelect');

    // Alexandria Live Clock & Prayer Times Engine
    initAlexandriaPrayerEngine();
    initTasbeehEngine();

    // 1. Fetch Network Info & Check Login
    await fetchNetworkInfo();
    checkExistingAuth();

    // 2. Setup Global Hotkeys for Panic Button
    setupStealthHotkeys();

    // 3. Setup UI Listeners
    setupEventListeners();

    // 4. Desktop Notifications & Read Receipts
    initDesktopNotifications();
});

// ----------------------------------------------------
// Notifications, Tab Alert & Seen (سين) System
// ----------------------------------------------------
let titleAlertInterval = null;
const originalDocTitle = 'نؤطة (No2ta) - شبكة الفصل الاجتماعية';

function triggerTabTitleAlert(senderName) {
    if (document.hasFocus()) return;
    if (titleAlertInterval) clearInterval(titleAlertInterval);

    let isAlert = true;
    titleAlertInterval = setInterval(() => {
        document.title = isAlert ? `💬 (1) رسالة من ${senderName} | نؤطة` : originalDocTitle;
        isAlert = !isAlert;
    }, 1200);
}

function stopTabTitleAlert() {
    if (titleAlertInterval) {
        clearInterval(titleAlertInterval);
        titleAlertInterval = null;
        document.title = originalDocTitle;
    }
}

window.addEventListener('focus', () => {
    stopTabTitleAlert();
    // When returning to window, mark active direct chat as read
    if (STATE.activeChat && STATE.activeChat.type === 'direct' && STATE.activeChat.recipient && STATE.user) {
        STATE.socket?.emit('mark_messages_read', {
            senderId: STATE.activeChat.recipient.id,
            recipientId: STATE.user.id
        });
    }
});

function initDesktopNotifications() {
    if ('Notification' in window && Notification.permission === 'default') {
        const askPermission = () => {
            Notification.requestPermission();
            window.removeEventListener('click', askPermission);
            window.removeEventListener('keydown', askPermission);
        };
        window.addEventListener('click', askPermission, { once: true });
        window.addEventListener('keydown', askPermission, { once: true });
    }
}

function showDesktopNotification(senderName, text, chatType, targetId) {
    try {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
        if (document.hasFocus()) return;

        const notif = new Notification(`💬 ${senderName} (نؤطة ⚡)`, {
            body: text,
            icon: '/favicon.ico',
            tag: `no2ta-chat-${targetId || 'general'}`
        });

        notif.onclick = () => {
            window.focus();
            if (chatType === 'direct' && targetId) {
                selectDirectChat(targetId);
            } else if (chatType === 'group' && targetId) {
                selectGroupChat(targetId);
            } else {
                selectGeneralChat();
            }
            notif.close();
        };
    } catch (e) {
        console.warn('Desktop notification error:', e);
    }
}

function formatChatTime(isoString) {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        if (isToday) {
            return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' });
    } catch (e) {
        return '';
    }
}

// ----------------------------------------------------
// 1. Network & Auth
// ----------------------------------------------------
async function fetchNetworkInfo() {
    try {
        const res = await fetch('/api/network-info');
        const data = await res.json();
        STATE.networkInfo = data;

        // Render IP & QR in joining modal
        const hostUrlEl = document.getElementById('networkHostUrl');
        const clientIpEl = document.getElementById('clientDetectedIp');
        const clientMacEl = document.getElementById('clientDetectedMac');
        const qrImg = document.getElementById('networkQrImg');
        const weekendBadge = document.getElementById('weekendFreezeBadge');

        if (hostUrlEl) hostUrlEl.textContent = data.joinUrl || `http://${data.primaryLanIp}:${data.port}`;
        if (clientIpEl) clientIpEl.textContent = data.clientIp;
        if (clientMacEl) clientMacEl.textContent = data.clientMac || 'جاري الفحص...';
        if (qrImg) qrImg.src = data.qrCodeDataUrl;

        if (weekendBadge) {
            if (data.isWeekend) {
                weekendBadge.classList.remove('hidden');
            } else {
                weekendBadge.classList.add('hidden');
            }
        }

        // Auto-promote ONLY this machine to Admin
        if (data.isHostAdmin || data.isAdmin) {
            if (STATE.user) {
                STATE.user.role = 'admin';
                localStorage.setItem('no2ta_user', JSON.stringify(STATE.user));
                updateProfileUI();
            }
            // Pre-fill login modal if open
            const nickInput = document.getElementById('authNickname');
            if (nickInput && !nickInput.value) nickInput.value = 'كبير الفصل (الأدمن) 👑';
            const adminRadio = document.querySelector('input[name="authAvatar"][value="👑"]');
            if (adminRadio) adminRadio.checked = true;
        } else {
            // Demote any non-admin device to student
            if (STATE.user && STATE.user.role === 'admin') {
                STATE.user.role = 'student';
                localStorage.setItem('no2ta_user', JSON.stringify(STATE.user));
                updateProfileUI();
            }
        }

        // Check if user is on standalone localhost on a secondary machine
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const warnBanner = document.getElementById('standaloneLocalhostBanner');
        if (warnBanner) {
            if (isLocalhost && !data.isHostAdmin) {
                warnBanner.classList.remove('hidden');
            } else {
                warnBanner.classList.add('hidden');
            }
        }

        const hostInput = document.getElementById('targetHostIpInput');
        if (hostInput) {
            hostInput.value = localStorage.getItem('no2ta_custom_host_ip') || (data.primaryLanIp !== '127.0.0.1' ? data.primaryLanIp : '');
        }
    } catch (e) {
        console.error('Failed to fetch network info:', e);
    }
}

function checkExistingAuth() {
    const saved = localStorage.getItem('no2ta_user');
    if (saved) {
        try {
            STATE.user = JSON.parse(saved);
            finishLoginSuccess();
            return;
        } catch (e) {
            localStorage.removeItem('no2ta_user');
        }
    }
    // Show Login Modal
    showModal('authModal');
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const passInput = document.getElementById('authPassword');
    const nickInput = document.getElementById('authNickname');
    const avatarInput = document.querySelector('input[name="authAvatar"]:checked');
    const errorEl = document.getElementById('authError');

    errorEl.classList.add('hidden');
    const password = passInput.value.trim();
    const nickname = nickInput.value.trim();
    const avatar = STATE.pendingAuthAvatarUrl || (avatarInput ? avatarInput.value : '🚀');

    if (password !== MASTER_PASSWORD) {
        errorEl.textContent = 'كلمة السر غير صحيحة! الباسوورد هو [REDACTED_SHARED_PASSWORD]';
        errorEl.classList.remove('hidden');
        return;
    }

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password,
                nickname: nickname || undefined,
                avatar,
                deviceId: localStorage.getItem('no2ta_device_id') || undefined
            })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            errorEl.textContent = data.error || 'فشل تسجيل الدخول!';
            errorEl.classList.remove('hidden');
            return;
        }

        STATE.user = data.user;
        localStorage.setItem('no2ta_user', JSON.stringify(data.user));
        localStorage.setItem('no2ta_device_id', data.user.device_id || `dev_${Date.now()}`);

        hideModal('authModal');
        finishLoginSuccess();
    } catch (err) {
        errorEl.textContent = 'تعذر الاتصال بالسيرفر المركزي!';
        errorEl.classList.remove('hidden');
    }
}

function finishLoginSuccess() {
    updateProfileUI();
    initSocket();
    loadUsers();
    loadGroups();
    loadStories();
    loadMessages();
    loadAirDropFiles();
    initWhiteboard();
    startStudentAutoScreenStream();
}

function updateProfileUI() {
    if (!STATE.user) return;
    const nameEl = document.getElementById('myNickname');
    const avatarEl = document.getElementById('myAvatar');
    const roleEl = document.getElementById('myRoleBadge');
    const adminBtn = document.getElementById('adminDashboardBtn');

    if (nameEl) nameEl.textContent = STATE.user.nickname;
    if (avatarEl) avatarEl.innerHTML = renderAvatarHTML(STATE.user.avatar);
    if (roleEl) {
        roleEl.textContent = STATE.user.role === 'admin' ? 'أدمن الفصل' : 'طالب عبقري';
        roleEl.className = STATE.user.role === 'admin' 
            ? 'px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30'
            : 'px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
    }

    if (adminBtn) {
        if (STATE.user.role === 'admin') {
            adminBtn.classList.remove('hidden');
        } else {
            adminBtn.classList.add('hidden');
        }
    }

    const netSupportBtn = document.getElementById('netSupportBtn');
    if (netSupportBtn) {
        if (STATE.user.role === 'admin' || (STATE.networkInfo && STATE.networkInfo.isHostAdmin)) {
            netSupportBtn.classList.remove('hidden');
        } else {
            netSupportBtn.classList.add('hidden');
        }
    }

    const globalUnlockBtn = document.getElementById('stealthGlobalUnlockBtn');
    if (globalUnlockBtn) {
        if (STATE.networkInfo && STATE.networkInfo.isHostAdmin) {
            globalUnlockBtn.classList.remove('hidden');
        } else {
            globalUnlockBtn.classList.add('hidden');
        }
    }
}

// ----------------------------------------------------
// 2. Socket.IO Real-time Hub
// ----------------------------------------------------
function initSocket() {
    if (STATE.socket) return;
    STATE.socket = io({ reconnection: true });

    STATE.socket.on('connect', () => {
        console.log('⚡ Connected to No2ta Socket Engine');
        STATE.socket.emit('register_presence', STATE.user);
        if (STATE.user && STATE.user.role !== 'admin') {
            setTimeout(captureStudentLiveSnapshot, 800);
        }
    });

    
    STATE.socket.on('streak_updated', (data) => {
        if (!data || !STATE.user) return;
        const otherId = data.userA === STATE.user.id ? data.userB : data.userA;
        let s = STATE.streaks.find(item => item.other_user_id === otherId);
        if (s) {
            s.streak_count = data.streak_count;
            s.is_frozen = data.is_frozen;
            s.interaction_count = data.interaction_count;
        } else {
            STATE.streaks.push({
                other_user_id: otherId,
                streak_count: data.streak_count,
                is_frozen: data.is_frozen,
                interaction_count: data.interaction_count
            });
        }
        renderUsersList();
        updateDirectStreakBadge(otherId);

        if (data.status === 'boosted') {
            const targetUser = STATE.users.find(u => u.id === otherId);
            const name = targetUser ? targetUser.nickname : 'زميلك';
            showNotification(`🔥 زاد الاستريك بينك وبين ${name} إلى ${data.streak_count}! حافظ عليه ⚡`);
        }
    });

    STATE.socket.on('dhikr_spoken_broadcast', (data) => {
        if (!data || !data.dhikrId) return;
        playDhikrAudioPhrase(data.dhikrId, data.dhikrTitle);
        showDhikrFloatingToast(data);
    });

    STATE.socket.on('salawat_broadcast', (data) => {
        handleSalawatBroadcast(data);
    });

    STATE.socket.on('tasbeeh_global_update', (data) => {
        if (data && typeof data.total !== 'undefined') {
            tasbeehState.classroomTotal = data.total;
            const el = document.getElementById('tasbeehClassroomTotal');
            if (el) el.textContent = data.total.toLocaleString('ar-EG');
        }
    });

    STATE.socket.on('presence_update', (data) => {
        STATE.onlineUserIds = new Set(data.onlineUserIds);
        renderUsersList();
        if (STATE.activeChat?.type === "direct") updateDirectStreakBadge(STATE.activeChat.recipient?.id);
        updateOnlineCount();
    });

    STATE.socket.on('codepad_sync', (data) => {
        if (!data) return;
        STATE.codepad.text = data.text !== undefined ? data.text : '';
        const textarea = document.getElementById('sharedCodePadTextarea');
        if (textarea && document.activeElement !== textarea) {
            textarea.value = STATE.codepad.text;
            updateCodePadStats();
        }
    });

    STATE.socket.on('new_message', (data) => {
        const { message, streakInfo } = data;
        const isMe = STATE.user && message.sender_id === STATE.user.id;
        const isCurrentChat = (message.chat_type === 'general' && STATE.activeChat.type === 'general') ||
            (message.chat_type === 'direct' && STATE.activeChat.type === 'direct' &&
             (message.sender_id === STATE.activeChat.recipient?.id || message.recipient_id === STATE.activeChat.recipient?.id)) ||
            (message.chat_type === 'group' && STATE.activeChat.type === 'group' &&
             message.recipient_id === STATE.activeChat.group?.id);

        if (isCurrentChat) {
            STATE.messages.push(message);
            appendMessageBubble(message);
            scrollToBottom();
        }

        // Sound Notification
        if (isMe) {
            window.soundEngine.playSend();
        } else {
            window.soundEngine.playReceive();
        }

        // 1. Dynamic Reordering & Unread Indicator ("اخر شات اكلمه يظهر فوق" + "تفضل جنبها علامة")
        if (message.chat_type === 'direct') {
            const partnerId = isMe ? message.recipient_id : message.sender_id;
            const partnerIdx = STATE.users.findIndex(u => u.id === partnerId);
            if (partnerIdx !== -1) {
                const [partner] = STATE.users.splice(partnerIdx, 1);
                partner.last_message_at = message.created_at;
                partner.last_message_text = message.content || (message.media_type ? 'ملف مرفق 📎' : '');

                if (!isMe) {
                    if (!isCurrentChat || !document.hasFocus()) {
                        partner.unread_count = (Number(partner.unread_count) || 0) + 1;
                    } else {
                        STATE.socket.emit('mark_messages_read', { senderId: partner.id, recipientId: STATE.user.id });
                    }
                }

                // Place at index 0 (top of sidebar!)
                STATE.users.unshift(partner);
                renderUsersList();
            } else {
                loadUsers();
            }
        } else if (message.chat_type === 'group' && message.recipient_id) {
            const groupIdx = STATE.groups.findIndex(g => g.id === message.recipient_id);
            if (groupIdx !== -1) {
                const [grp] = STATE.groups.splice(groupIdx, 1);
                grp.last_message_at = message.created_at;
                STATE.groups.unshift(grp);
                if (typeof renderGroupsList === 'function') renderGroupsList();
            }
        }

        // 2. Incoming Notification Delivery ("تجيلي نوتفيكيشن")
        if (!isMe) {
            const senderName = message.sender_name || 'زميل في الفصل';
            const previewText = message.content 
                ? (message.content.length > 40 ? message.content.substring(0, 37) + '...' : message.content)
                : (message.media_type ? 'أرسل مرفقاً 📎' : 'رسالة جديدة');

            // Floating in-app pill notification (if chat is not active or window blurred)
            if (!isCurrentChat || !document.hasFocus()) {
                const chatTag = message.chat_type === 'direct' ? 'خاص' : (message.chat_type === 'group' ? 'جروب' : 'عام');
                showNotification(`💬 [${chatTag}] ${senderName}: ${previewText}`, 4000);
            }

            // Native Desktop Web Notification
            const targetId = message.chat_type === 'direct' ? message.sender_id : (message.chat_type === 'group' ? message.recipient_id : null);
            showDesktopNotification(senderName, previewText, message.chat_type, targetId);

            // Tab Title Alert Flash
            triggerTabTitleAlert(senderName);
        }

        // 3. Streak Engine Update
        if (streakInfo && (message.sender_id === STATE.user?.id || message.recipient_id === STATE.user?.id)) {
            const otherId = message.sender_id === STATE.user.id ? message.recipient_id : message.sender_id;
            let s = STATE.streaks.find(item => item.other_user_id === otherId);
            if (s) {
                s.streak_count = streakInfo.streak_count;
                s.is_frozen = streakInfo.is_frozen;
                s.interaction_count = streakInfo.interaction_count;
            } else {
                STATE.streaks.push({
                    other_user_id: otherId,
                    streak_count: streakInfo.streak_count,
                    is_frozen: streakInfo.is_frozen,
                    interaction_count: streakInfo.interaction_count
                });
            }
            renderUsersList();
            updateDirectStreakBadge(otherId);

            if (streakInfo.status === 'boosted') {
                showNotification(`🔥 استريك مشتعل! وصلتوا لـ ${streakInfo.streak_count} استريك معاً ⚡`);
            }
        }
    });

    // Handle messages marked as read by recipient (double cyan checkmarks ✓✓)
    STATE.socket.on('messages_marked_read', (data) => {
        const { readerId } = data;
        if (STATE.activeChat && STATE.activeChat.type === 'direct' && STATE.activeChat.recipient?.id === readerId) {
            STATE.messages.forEach(m => {
                if (m.sender_id === STATE.user?.id) {
                    m.is_read = 1;
                }
            });
            document.querySelectorAll('.msg-read-check').forEach(el => {
                el.textContent = '✓✓';
                el.className = 'msg-read-check text-cyan-400 font-bold';
                el.title = 'تمت القراءة (سين) ✓✓';
            });
        }
    });

    // 👥 Classroom Groups Socket Events
    STATE.socket.on('group_created', (data) => {
        loadGroups();
        if (data && data.group) {
            const isMember = (data.group.creator_id === STATE.user?.id) ||
                             (data.group.members && data.group.members.some(m => m.id === STATE.user?.id));
            if (isMember && data.group.creator_id !== STATE.user?.id) {
                showNotification(`👥 تمت إضافتك إلى جروب جديد: "${data.group.name}"! 🎉`);
            }
        }
    });

    STATE.socket.on('group_deleted', (data) => {
        loadGroups();
        if (STATE.activeChat.type === 'group' && STATE.activeChat.group?.id === data.groupId) {
            showNotification(`⚠️ تم حذف الجروب "${data.groupName || ''}". العودة لشات الفصل.`);
            selectGeneralChat();
        }
    });

    STATE.socket.on('new_group_join_request', (data) => {
        loadGroups();
        if (window.soundEngine && typeof window.soundEngine.playNotification === 'function') {
            window.soundEngine.playNotification();
        }
        showNotification(`طلب انضمام جديد من ${data.request?.nickname || 'زميل'} لجروب "${data.groupName}"!`);
        if (STATE.activeChat.type === 'group' && STATE.activeChat.group?.id === data.groupId) {
            const reqBtn = document.getElementById('groupHeaderJoinRequestsBtn');
            const reqCount = document.getElementById('groupHeaderJoinRequestsCount');
            if (reqBtn && reqCount) {
                reqBtn.classList.remove('hidden');
                const curr = parseInt(reqCount.textContent || '0', 10) + 1;
                reqCount.textContent = curr;
            }
        }
    });

    STATE.socket.on('group_join_request_accepted', (data) => {
        loadGroups();
        if (STATE.user && data.userId === STATE.user.id) {
            showNotification(`🎉 وافق المشرف على انضمامك لجروب "${data.groupName}"! الشات متاح لك الآن.`);
            if (STATE.activeChat.type === 'group' && STATE.activeChat.group?.id === data.groupId) {
                loadGroups().then(() => {
                    selectGroupChat(data.groupId);
                });
            }
        }
    });

    STATE.socket.on('group_join_request_rejected', (data) => {
        loadGroups();
        if (STATE.user && data.userId === STATE.user.id) {
            showNotification(`❌ تم رفض طلب انضمامك لجروب "${data.groupName}".`);
            if (STATE.activeChat.type === 'group' && STATE.activeChat.group?.id === data.groupId) {
                loadGroups().then(() => {
                    selectGroupChat(data.groupId);
                });
            }
        }
    });

    STATE.socket.on('groups_updated', () => {
        loadGroups();
    });

    // 🎵 Classroom Music Library Sync
    STATE.socket.on('music_library_updated', () => {
        loadMusicLibrary();
    });

    STATE.socket.on('user_typing_start', (data) => {
        if (data.userId !== STATE.user.id) {
            showTypingIndicator(data.nickname);
        }
    });

    STATE.socket.on('user_typing_stop', (data) => {
        if (data.userId !== STATE.user.id) {
            hideTypingIndicator();
        }
    });

    STATE.socket.on('message_reactions_updated', ({ messageId, reactions }) => {
        const msg = STATE.messages.find(m => m.id === messageId);
        if (msg) msg.reactions = reactions;
        renderMessageReactions(messageId, reactions);
        window.soundEngine.playReaction();
    });

    STATE.socket.on('disappearing_messages_expired', ({ messageIds }) => {
        messageIds.forEach(id => {
            const el = document.getElementById(`msg-${id}`);
            if (el) {
                el.classList.add('transition-all', 'duration-700', 'opacity-0', 'scale-90', 'blur-sm');
                setTimeout(() => el.remove(), 700);
            }
            STATE.messages = STATE.messages.filter(m => m.id !== id);
        });
    });

    STATE.socket.on('message_deleted', ({ messageId }) => {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) {
            el.classList.add('transition-all', 'duration-500', 'opacity-0', 'scale-90', 'blur-sm');
            setTimeout(() => el.remove(), 500);
        }
        STATE.messages = STATE.messages.filter(m => m.id !== messageId);
    });

    STATE.socket.on('new_story_published', () => {
        loadStories();
    });

    STATE.socket.on('story_deleted', () => {
        loadStories();
    });

    STATE.socket.on('airdrop_new_file', (file) => {
        STATE.airdropFiles.unshift(file);
        renderAirDropList();
        showNotification(`⚡ ملف جديد على AirDrop: ${file.file_name}`);
    });

    STATE.socket.on('airdrop_download_incremented', ({ id, count }) => {
        const badge = document.getElementById(`airdrop-dl-${id}`);
        if (badge) badge.textContent = count;
    });

    STATE.socket.on('chat_focus_mode_changed', ({ isLocked }) => {
        STATE.isChatLocked = isLocked;
        const banner = document.getElementById('chatFocusBanner');
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendMsgBtn');

        if (banner) banner.classList.toggle('hidden', !isLocked);
        if (input && STATE.user.role !== 'admin') input.disabled = isLocked;
        if (sendBtn && STATE.user.role !== 'admin') sendBtn.disabled = isLocked;
    });

    STATE.socket.on('admin_global_announcement', (data) => {
        window.soundEngine.playAnnouncement();
        showAnnouncementModal(data);
    });

    // 🖥️ SCREEN SHARE & WEBRTC SOCKET EVENTS 🖥️
    STATE.socket.on('screen_share_started', (shareInfo) => {
        handleScreenShareStarted(shareInfo);
    });

    STATE.socket.on('screen_share_ended', () => {
        handleScreenShareEnded();
    });

    STATE.socket.on('webrtc_viewer_joined', (data) => {
        handleViewerJoined(data);
    });

    STATE.socket.on('webrtc_offer', (data) => {
        handleIncomingOffer(data);
    });

    STATE.socket.on('webrtc_answer', (data) => {
        handleIncomingAnswer(data);
    });

    STATE.socket.on('webrtc_ice_candidate', (data) => {
        handleIncomingIceCandidate(data);
    });

    // 🎵 SYNCHRONIZED CLASSROOM RADIO EVENTS 🎵
    STATE.socket.on('radio_sync_state', (state) => {
        handleRadioSyncState(state);
    });

    // Quick Math Challenge
    STATE.socket.on('math_game_state', (state) => handleMathGameState(state));
    STATE.socket.on('math_game_round_result', (data) => handleMathGameRoundResult(data));

    // 👁️ LIVE STORY VIEW UPDATE
    STATE.socket.on('story_view_updated', ({ storyId, viewsCount }) => {
        if (currentViewingGroup && currentViewingGroup.stories[activeStoryIndex]?.id === storyId) {
            updateStoryViewsDisplay(viewsCount);
        }
    });

    // 🚨 GLOBAL PANIC & STEALTH BROADCAST 🚨
    STATE.socket.on('GLOBAL_STEALTH_ENGAGED', (data) => {
        // If data.timestamp > 0 and fresh (within 15 seconds), this is a fresh global panic!
        if (data && data.timestamp && (Date.now() - data.timestamp < 15000)) {
            STATE.localStealthSuppressed = false; // Fresh panic overrides local suppression!
        }
        if (!STATE.localStealthSuppressed) {
            console.warn('🚨 GLOBAL PANIC ACTIVATED! Engaging Stealth Mode instantly...');
            engageStealthMode(data);
        }
    });

    STATE.socket.on('GLOBAL_STEALTH_RELEASED', (data) => {
        console.log('✅ Stealth mode released by teacher/admin');
        STATE.localStealthSuppressed = false;
        releaseStealthMode(data);
    });

    STATE.socket.on('user_kicked', (data) => {
        alert(data.reason || 'تم طردك بواسطة أدمن الفصل!');
        localStorage.removeItem('no2ta_user');
        window.location.reload();
    });

    // 🖥️ NETSUPPORT CLASSROOM MONITOR & REMOTE CONTROL EVENTS
    STATE.socket.on('netsupport_lock_screen', (data) => {
        const overlay = document.getElementById('studentLockScreenOverlay');
        const reasonEl = document.getElementById('studentLockReasonText');
        if (reasonEl && data && data.reason) {
            reasonEl.textContent = data.reason;
        }
        if (overlay) overlay.classList.remove('hidden');
        const audio = getRadioAudioElement();
        if (audio) audio.pause();
    });

    STATE.socket.on('netsupport_unlock_screen', () => {
        const overlay = document.getElementById('studentLockScreenOverlay');
        if (overlay) overlay.classList.add('hidden');
        showNotification('🔓 تم فك قفل الشاشة بواسطة الأستاذ.');
    });

    STATE.socket.on('netsupport_popup_message', (data) => {
        const modal = document.getElementById('studentDirectWarningModal');
        const titleEl = document.getElementById('studentDirectWarningTitle');
        const msgEl = document.getElementById('studentDirectWarningMsg');
        const timeEl = document.getElementById('studentDirectWarningTime');
        if (titleEl && data.title) titleEl.textContent = data.title;
        if (msgEl) msgEl.textContent = data.message;
        if (timeEl) timeEl.textContent = data.time || '';
        if (modal) modal.classList.remove('hidden');
        if (window.soundEngine && typeof window.soundEngine.playAnnouncement === 'function') {
            window.soundEngine.playAnnouncement();
        }
    });

    STATE.socket.on('netsupport_play_alarm', () => {
        if (window.soundEngine && typeof window.soundEngine.playAnnouncement === 'function') {
            window.soundEngine.playAnnouncement();
        }
        showNotification('🔔 تنبيه صوتي عاجل من مشرف المعمل!');
    });

    STATE.socket.on('netsupport_navigate_url', (data) => {
        if (data && data.url) {
            window.location.href = data.url;
        }
    });

    STATE.socket.on('netsupport_request_screen_share', () => {
        promptStudentNetSupportScreenShare();
    });

    STATE.socket.on('netsupport_device_frame_update', (data) => {
        handleNetSupportFrameUpdate(data);
    });
}

// ----------------------------------------------------
// 3. Stealth Mode ("زر البشمهندسة" 🚨)
// ----------------------------------------------------
let lastEscPress = 0;

function setupStealthHotkeys() {
    window.addEventListener('keydown', (e) => {
        // Hotkey: F2 triggers instant stealth on EVERYONE!
        if (e.key === 'F2') {
            e.preventDefault();
            triggerPanicButton();
            return;
        }

        // Hotkey: F3 closes stealth on THIS device only (Requires Password)
        if (e.key === 'F3') {
            e.preventDefault();
            promptLocalStealthUnlock();
            return;
        }

        // Hotkey: Double tap Escape within 400ms triggers instant stealth
        if (e.key === 'Escape') {
            const now = Date.now();
            if (now - lastEscPress < 400) {
                e.preventDefault();
                triggerPanicButton();
                lastEscPress = 0;
                return;
            }
            lastEscPress = now;
        }

        // Secret Exit Hotkey: Ctrl + Shift + S prompts to unlock on this device
        if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
            e.preventDefault();
            promptLocalStealthUnlock();
        }
    });

    const panicBtn = document.getElementById('panicTriggerBtn');
    if (panicBtn) {
        panicBtn.addEventListener('click', triggerPanicButton);
    }
}

function triggerPanicButton() {
    STATE.localStealthSuppressed = false;
    if (STATE.socket) {
        STATE.socket.emit('TRIGGER_GLOBAL_PANIC');
    }
    // Also trigger immediately locally with 0ms delay!
    engageStealthMode({ triggeredBy: STATE.user ? STATE.user.nickname : 'أنت' });
}

function engageStealthMode(info) {
    STATE.isStealthActive = true;
    window.soundEngine.killAllAudio();

    // Mute and pause any active screen share immediately!
    const screenVideo = document.getElementById('screenShareVideo');
    if (screenVideo) {
        screenVideo.pause();
        screenVideo.muted = true;
    }

    // Mute and pause radio audio / YouTube playback immediately
    if (window.ytPlayer && typeof window.ytPlayer.pauseVideo === 'function') {
        try {
            window.ytPlayer.pauseVideo();
            window.ytPlayer.mute();
        } catch (e) {}
    }
    const radioAudio = document.getElementById('classroomAudioElement');
    if (radioAudio) {
        radioAudio.pause();
        radioAudio.muted = true;
    }

    // 1. Change Document Title & Favicon to Physics Exam
    document.title = 'نموذج إجابة واختبار مهارات فلاتر - Flutter Competency Exam & Model Answers';
    const favicon = document.getElementById('appFavicon');
    if (favicon) {
        favicon.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📚</text></svg>';
    }

    // 2. Show Fullscreen Physics Revision Overlay
    const overlay = document.getElementById('stealthPhysicsOverlay');
    const iframe = document.getElementById('stealthIframe');
    if (overlay && iframe) {
        if (!iframe.src || iframe.src === 'about:blank' || !iframe.src.includes('physics.html')) {
            iframe.src = '/stealth/physics.html';
        }
        overlay.classList.remove('hidden');
    }
}

function releaseStealthMode(info) {
    STATE.isStealthActive = false;
    window.soundEngine.resumeAudio();

    // Resume screen share video if active
    const screenVideo = document.getElementById('screenShareVideo');
    if (screenVideo && screenVideo.srcObject) {
        screenVideo.play().catch(() => {});
        if (!STATE.screenShare.isSharing) {
            screenVideo.muted = false;
        }
    }

    // Unmute YouTube player if active
    if (window.ytPlayer && typeof window.ytPlayer.unMute === 'function') {
        try {
            window.ytPlayer.unMute();
            if (STATE.radio.isPlaying && STATE.radio.activeTrack?.videoId) {
                window.ytPlayer.playVideo();
            }
        } catch (e) {}
    }
    const radioAudio = document.getElementById('classroomAudioElement');
    if (radioAudio) {
        radioAudio.muted = false;
        if (STATE.radio.isPlaying && !STATE.radio.activeTrack?.videoId) {
            radioAudio.play().catch(() => {});
        }
    }

    // Restore Title & Favicon
    document.title = 'نؤطة (No2ta) 💬⚡ - شبكة الفصل الاجتماعية';
    const favicon = document.getElementById('appFavicon');
    if (favicon) {
        favicon.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>';
    }

    // Hide Physics Overlay
    const overlay = document.getElementById('stealthPhysicsOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }

    if (info && info.message) {
        showNotification(info.message);
    }
}

// Local unlock for THIS device only (Never affects other classmates)
function promptLocalStealthUnlock() {
    const pass = prompt('🔐 أدخل كلمة السر لإغلاق شاشة التمويه على جهازك فقط والعودة للشات:');
    if (pass === null) return; // User cancelled
    if (pass && pass.trim() === MASTER_PASSWORD) {
        STATE.localStealthSuppressed = true;
        releaseStealthMode({ message: 'تم إغلاق شاشة التمويه على جهازك فقط 🤫' });
    } else {
        alert('❌ كلمة المرور غير صحيحة! لن يتم إغلاق شاشة التمويه.');
    }
}

// Global unlock for EVERYONE in the classroom (Strictly Hardware Admin / Master Password)
function promptGlobalStealthUnlock() {
    if (!STATE.networkInfo || !STATE.networkInfo.isHostAdmin) {
        alert('⚠️ فك التمويه لجميع أجهزة الفصل متاح فقط من جهاز الأدمن/المضيف الرئيسي!');
        return;
    }
    const pass = prompt('👑 أدخل كلمة السر لفك وضع التمويه عن جميع طلاب الفصل:');
    if (pass === null) return;
    if (pass && pass.trim() === MASTER_PASSWORD) {
        if (STATE.socket) {
            STATE.socket.emit('TRIGGER_STEALTH_RELEASE', pass.trim());
        }
        releaseStealthMode({ message: 'تم فك وضع التمويه لجميع أجهزة الفصل! 🚀' });
    } else {
        alert('❌ كلمة المرور غير صحيحة!');
    }
}

function promptStealthUnlock() {
    promptLocalStealthUnlock();
}

// ----------------------------------------------------
// 4. Users, Chats & Streaks
// ----------------------------------------------------
async function loadUsers() {
    try {
        const currentUserId = STATE.user ? STATE.user.id : '';
        const res = await fetch(`/api/users?currentUserId=${encodeURIComponent(currentUserId)}`);
        const users = await res.json();
        STATE.users = users.filter(u => u.id !== STATE.user?.id);

        if (STATE.user) {
            const streakRes = await fetch(`/api/streaks/${STATE.user.id}`);
            const streakData = await streakRes.json();
            STATE.streaks = streakData.streaks || [];
        }

        renderUsersList();
    } catch (e) {
        console.error('Failed to load users:', e);
    }
}

function renderUsersList() {
    const container = document.getElementById('usersListContainer');
    if (!container) return;

    if (STATE.users.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-slate-500 text-xs">لا يوجد زملاء متصلين حالياً. شارك الـ QR Code ليدخلوا! 🚀</div>`;
        return;
    }

    container.innerHTML = STATE.users.map(u => {
        const isOnline = STATE.onlineUserIds.has(u.id);
        const streak = STATE.streaks.find(s => s.other_user_id === u.id);
        const streakCount = streak ? streak.streak_count : 0;
        const isFrozen = streak ? streak.is_frozen : STATE.networkInfo.isWeekend;
        const streakBadge = streakCount > 0 
            ? `<span class="inline-flex items-center gap-1 text-micro font-bold px-1.5 py-0.5 rounded-full ${isFrozen ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' : 'bg-orange-500/10 text-orange-400 border border-orange-500/30'}" title="${isFrozen ? 'الاستريك مجمد لعطلة نهاية الأسبوع ❄️' : 'استريك نشط اليوم 🔥'}">
                ${isFrozen ? '❄️🔥' : '🔥'} ${streakCount}
               </span>`
            : '';

        const unreadCount = Number(u.unread_count || 0);
        const hasUnread = unreadCount > 0;
        const isSelected = STATE.activeChat.type === 'direct' && STATE.activeChat.recipient?.id === u.id;

        // Visual Unread Badge (سين)
        const unreadBadge = hasUnread 
            ? `<span class="unread-pill inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-micro font-black bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/50 animate-pulse" title="${unreadCount} رسائل غير مقروءة">
                ${unreadCount > 99 ? '99+' : unreadCount}
               </span>`
            : '';

        const timeStr = formatChatTime(u.last_message_at);
        let previewHTML = '';
        if (u.last_message_text) {
            previewHTML = hasUnread 
                ? `<p class="text-[11px] text-cyan-300 font-bold truncate max-w-[130px] flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>${escapeHtml(u.last_message_text)}</p>`
                : `<p class="text-[11px] text-slate-400 truncate max-w-[130px]">${escapeHtml(u.last_message_text)}</p>`;
        } else {
            previewHTML = `<p class="text-[11px] text-slate-500 truncate max-w-[130px]">${escapeHtml(u.bio || 'طالب عبقري')}</p>`;
        }

        let cardBgClass = 'hover:bg-slate-800/60 border border-transparent';
        if (isSelected) {
            cardBgClass = 'bg-cyan-500/15 border border-cyan-500/40 shadow-sm';
        } else if (hasUnread) {
            cardBgClass = 'bg-cyan-950/30 border border-cyan-500/50 hover:bg-cyan-900/30 shadow-md shadow-cyan-950/50';
        }

        return `
            <div onclick="selectDirectChat('${u.id}')" class="flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${cardBgClass}">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="relative shrink-0">
                        <div class="w-10 h-10 rounded-full bg-slate-800 border ${hasUnread ? 'border-cyan-400 ring-2 ring-cyan-400/30' : 'border-slate-700'} flex items-center justify-center text-xl overflow-hidden transition-all">
                            ${renderAvatarHTML(u.avatar)}
                        </div>
                        <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${isOnline ? 'bg-emerald-500 live-glow' : 'bg-slate-600'}"></span>
                        ${hasUnread ? `<span class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-900 animate-ping"></span><span class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-900"></span>` : ''}
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between gap-1 mb-0.5">
                            <div class="flex items-center gap-1.5 truncate">
                                <span class="text-sm font-bold ${hasUnread ? 'text-cyan-200' : 'text-white'} truncate">${escapeHtml(u.nickname)}</span>
                                ${u.role === 'admin' ? '<span class="text-micro text-amber-400 font-black shrink-0">👑</span>' : ''}
                            </div>
                            ${timeStr ? `<span class="text-micro ${hasUnread ? 'text-cyan-400 font-bold' : 'text-slate-500'} shrink-0">${timeStr}</span>` : ''}
                        </div>
                        ${previewHTML}
                    </div>
                </div>
                <div class="shrink-0 flex items-center gap-1.5 mr-2">
                    ${streakBadge}
                    ${unreadBadge}
                </div>
            </div>
        `;
    }).join('');
}

function updateOnlineCount() {
    const el = document.getElementById('onlineCountBadge');
    if (el) {
        el.textContent = `${STATE.onlineUserIds.size} متصل الآن`;
    }
}

// ----------------------------------------------------
// 4b. Sidebar Tabs & Chats Switcher (General / Groups / Direct)
// ----------------------------------------------------
function switchSidebarTab(tabName) {
    STATE.activeSidebarTab = tabName;
    updateSidebarTabsUI(tabName);

    const usersContainer = document.getElementById('usersListContainer');
    const groupsContainer = document.getElementById('groupsListContainer');
    const sectionTitle = document.getElementById('sidebarSectionTitle');
    const sectionAction = document.getElementById('sidebarSectionAction');

    if (tabName === 'groups') {
        if (usersContainer) usersContainer.classList.add('hidden');
        if (groupsContainer) groupsContainer.classList.remove('hidden');
        if (sectionTitle) sectionTitle.textContent = 'جروبات الفصل';
        if (sectionAction) {
            sectionAction.innerHTML = `
                <button onclick="openCreateGroupModal()" class="px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white text-[11px] font-bold shadow-md transition-all flex items-center gap-1">
                    <i data-lucide="plus" class="w-3 h-3"></i>
                    <span>إنشاء جروب</span>
                </button>
            `;
            renderIcons();
        }
        renderGroupsList();
    } else {
        if (groupsContainer) groupsContainer.classList.add('hidden');
        if (usersContainer) usersContainer.classList.remove('hidden');
        if (sectionTitle) sectionTitle.textContent = 'زملاء الفصل والـ Streaks';
        if (sectionAction) {
            sectionAction.innerHTML = '<span class="text-micro text-cyan-400 font-normal flex items-center gap-1"><i data-lucide="zap" class="w-3 h-3"></i> تحديث حي</span>';
            renderIcons();
        }
        renderUsersList();
    }
}

function updateSidebarTabsUI(activeTab) {
    const tabGen = document.getElementById('tabGeneralBtn');
    const tabGroups = document.getElementById('tabGroupsBtn');
    const tabDirect = document.getElementById('tabDirectBtn');

    const activeClass = 'flex-1 py-1.5 text-[11px] font-bold rounded-lg bg-cyan-500 text-slate-950 transition-all';
    const activeGroupClass = 'flex-1 py-1.5 text-[11px] font-bold rounded-lg bg-purple-500 text-white transition-all flex items-center justify-center gap-1';
    const inactiveClass = 'flex-1 py-1.5 text-[11px] font-semibold rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1';

    if (tabGen) tabGen.className = activeTab === 'general' ? activeClass : inactiveClass;
    if (tabGroups) tabGroups.className = activeTab === 'groups' ? activeGroupClass : inactiveClass;
    if (tabDirect) tabDirect.className = activeTab === 'direct' ? activeClass : inactiveClass;
}

function toggleChatInputVisibility(visible) {
    const chatForm = document.getElementById('chatForm');
    const lockedNotice = document.getElementById('groupLockedNoticeBar');
    if (visible) {
        if (chatForm) chatForm.classList.remove('hidden');
        if (lockedNotice) lockedNotice.classList.add('hidden');
    } else {
        if (chatForm) chatForm.classList.add('hidden');
        if (lockedNotice) lockedNotice.classList.remove('hidden');
    }
}


function updateDirectStreakBadge(otherUserId) {
    if (!STATE.activeChat || STATE.activeChat.type !== 'direct' || !STATE.activeChat.recipient) return;
    if (otherUserId && STATE.activeChat.recipient.id !== otherUserId) return;

    const streak = STATE.streaks.find(s => s.other_user_id === STATE.activeChat.recipient.id);
    const directBadge = document.getElementById('directStreakBadge');
    if (directBadge) {
        if (streak && streak.streak_count > 0) {
            directBadge.innerHTML = `<i data-lucide="${streak.is_frozen ? 'snowflake' : 'flame'}" class="w-3 h-3 inline-block align-text-bottom"></i> استريك ${streak.streak_count} يوم`;
            renderIcons();
            directBadge.classList.remove('hidden');
            directBadge.classList.remove('scale-110');
            void directBadge.offsetWidth;
            directBadge.classList.add('scale-110', 'transition-transform');
            setTimeout(() => directBadge.classList.remove('scale-110'), 300);
        } else {
            directBadge.classList.add('hidden');
        }
    }
}

function selectGeneralChat() {
    stopTabTitleAlert();
    STATE.activeChat = { type: 'general', recipient: null, group: null };
    document.getElementById('currentChatTitle').textContent = 'شات الفصل العام (General)';
    document.getElementById('currentChatSubtitle').textContent = 'متاح لجميع الزملاء في الفصل';
    document.getElementById('currentChatAvatar').innerHTML = '<i data-lucide="globe" class="w-[18px] h-[18px] text-cyan-400"></i>';
    renderIcons();
    
    const directBadge = document.getElementById('directStreakBadge');
    if (directBadge) directBadge.classList.add('hidden');

    const groupControls = document.getElementById('groupHeaderControls');
    if (groupControls) {
        groupControls.classList.add('hidden');
        groupControls.classList.remove('flex');
    }

    toggleChatInputVisibility(true);
    switchSidebarTab('general');
    loadMessages();
}

function selectDirectChat(userId) {
    const target = STATE.users.find(u => u.id === userId);
    if (!target) return;

    // 1. Clear unread mark immediately ("سين")
    target.unread_count = 0;
    renderUsersList();

    // 2. Notify server that messages from this user are now read
    if (STATE.socket && STATE.user) {
        STATE.socket.emit('mark_messages_read', { senderId: target.id, recipientId: STATE.user.id });
    }
    stopTabTitleAlert();

    STATE.activeChat = { type: 'direct', recipient: target, group: null };
    document.getElementById('currentChatTitle').textContent = target.nickname;
    document.getElementById('currentChatSubtitle').textContent = STATE.onlineUserIds.has(target.id) ? 'متصل الآن' : 'غير متصل حالياً';
    document.getElementById('currentChatAvatar').innerHTML = renderAvatarHTML(target.avatar);

    const streak = STATE.streaks.find(s => s.other_user_id === target.id);
    const directBadge = document.getElementById('directStreakBadge');
    if (directBadge) {
        if (streak && streak.streak_count > 0) {
            directBadge.innerHTML = `<i data-lucide="${streak.is_frozen ? 'snowflake' : 'flame'}" class="w-3 h-3 inline-block align-text-bottom"></i> استريك ${streak.streak_count} يوم`;
            renderIcons();
            directBadge.classList.remove('hidden');
        } else {
            directBadge.classList.add('hidden');
        }
    }

    const groupControls = document.getElementById('groupHeaderControls');
    if (groupControls) {
        groupControls.classList.add('hidden');
        groupControls.classList.remove('flex');
    }

    toggleChatInputVisibility(true);
    switchSidebarTab('direct');
    loadMessages();
}

function selectGroupChat(groupId) {
    stopTabTitleAlert();
    const target = STATE.groups.find(g => g.id === groupId);
    if (!target) return;

    STATE.activeChat = { type: 'group', recipient: null, group: target };
    document.getElementById('currentChatTitle').textContent = target.name;
    const memberCount = target.members_count || (target.members ? target.members.length : 0);
    const isMember = target.is_member === true;
    const isCreator = STATE.user && (target.creator_id === STATE.user.id || STATE.user.role === 'admin');

    if (isMember) {
        document.getElementById('currentChatSubtitle').textContent = `${memberCount} أعضاء • أنشأه: ${target.creator_name || 'زميلك'}`;
    } else {
        document.getElementById('currentChatSubtitle').textContent = `جروب خاص • ${memberCount} أعضاء • المشرف: ${target.creator_name || 'زميلك'}`;
    }
    document.getElementById('currentChatAvatar').innerHTML = `<span class="text-2xl">${target.icon || '👥'}</span>`;

    const directBadge = document.getElementById('directStreakBadge');
    if (directBadge) directBadge.classList.add('hidden');

    // Show Group Header Controls only if user is a member
    const groupControls = document.getElementById('groupHeaderControls');
    const membersCountEl = document.getElementById('groupHeaderMembersCount');
    const deleteBtn = document.getElementById('groupHeaderDeleteBtn');
    const reqBtn = document.getElementById('groupHeaderJoinRequestsBtn');
    const reqCount = document.getElementById('groupHeaderJoinRequestsCount');

    if (isMember) {
        if (groupControls) {
            groupControls.classList.remove('hidden');
            groupControls.classList.add('flex');
        }
        if (membersCountEl) {
            membersCountEl.textContent = `${memberCount}`;
        }
        if (deleteBtn) {
            if (isCreator) {
                deleteBtn.classList.remove('hidden');
            } else {
                deleteBtn.classList.add('hidden');
            }
        }
        if (reqBtn) {
            if (isCreator) {
                reqBtn.classList.remove('hidden');
                if (reqCount) {
                    reqCount.textContent = target.pending_requests_count || 0;
                }
            } else {
                reqBtn.classList.add('hidden');
            }
        }
        toggleChatInputVisibility(true);
    } else {
        // Non-member: strictly hide group controls
        if (groupControls) {
            groupControls.classList.add('hidden');
            groupControls.classList.remove('flex');
        }
        toggleChatInputVisibility(false);
    }

    switchSidebarTab('groups');
    loadMessages();
}

// ----------------------------------------------------
// 4c. Classroom Groups Management & APIs
// ----------------------------------------------------
async function loadGroups() {
    if (!STATE.user) return;
    try {
        const res = await fetch(`/api/groups?userId=${encodeURIComponent(STATE.user.id)}`);
        const data = await res.json();
        STATE.groups = data.groups || [];
        
        const countBadge = document.getElementById('groupsCountBadge');
        if (countBadge) {
            countBadge.textContent = STATE.groups.length;
            if (STATE.groups.length > 0) {
                countBadge.classList.remove('hidden');
            } else {
                countBadge.classList.add('hidden');
            }
        }

        renderGroupsList();
    } catch (err) {
        console.error('Failed to load groups:', err);
    }
}

function renderGroupsList() {
    const container = document.getElementById('groupsListContainer');
    if (!container) return;

    if (STATE.groups.length === 0) {
        container.innerHTML = `
            <div class="p-4 text-center">
                <div class="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-2xl flex items-center justify-center mx-auto mb-2 text-purple-400">
                    👥
                </div>
                <h4 class="text-xs font-bold text-white mb-1">لا توجد جروبات بعد</h4>
                <p class="text-micro text-slate-400 mb-3">أنشئ أول جروب في الفصل واجمع أصحابك وشلتك!</p>
                <button onclick="openCreateGroupModal()" class="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white text-xs font-black shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5">
                    <span>✨</span>
                    <span>إنشاء أول جروب الآن</span>
                </button>
            </div>
        `;
        return;
    }

    let html = `
        <button onclick="openCreateGroupModal()" class="w-full p-2 rounded-xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 text-purple-200 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm mb-1.5">
            <span>✨</span>
            <span>إنشاء جروب جديد (Create Group)</span>
            <span>➕</span>
        </button>
    `;

    STATE.groups.forEach(g => {
        const isSelected = STATE.activeChat.type === 'group' && STATE.activeChat.group?.id === g.id;
        const memberCount = g.members_count || (g.members ? g.members.length : 0);
        const isCreator = STATE.user && (g.creator_id === STATE.user.id || STATE.user.role === 'admin');
        const isMember = g.is_member === true;
        const isPending = g.request_status === 'pending';
        const pendingCount = g.pending_requests_count || 0;

        let statusBadge = '';
        if (isCreator) {
            statusBadge = '<span class="text-micro px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold">مؤسس 👑</span>';
        } else if (isMember) {
            statusBadge = '<span class="text-micro px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">عضو ✅</span>';
        } else if (isPending) {
            statusBadge = '<span class="text-micro px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold">معلق</span>';
        } else {
            statusBadge = '<span class="text-micro px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-bold border border-slate-700">🔒 خاص</span>';
        }

        let pendingBadge = '';
        if (isCreator && pendingCount > 0) {
            pendingBadge = `<span class="text-micro px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black animate-pulse shadow-sm" title="${pendingCount} طلبات معلقة">${pendingCount}</span>`;
        }

        html += `
            <div onclick="selectGroupChat('${g.id}')" class="flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${isSelected ? 'bg-purple-500/20 border border-purple-500/40 shadow-md' : 'hover:bg-slate-800/60 border border-transparent'}">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-10 h-10 rounded-2xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-xl shrink-0 shadow">
                        ${g.icon || '👥'}
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                            <h4 class="text-xs font-bold text-white truncate">${escapeHtml(g.name)}</h4>
                            ${statusBadge}
                        </div>
                        <p class="text-micro text-slate-400 truncate">${g.description ? escapeHtml(g.description) : `${memberCount} أعضاء في الجروب`}</p>
                    </div>
                </div>
                <div class="shrink-0 flex items-center gap-1">
                    ${pendingBadge}
                    <span class="text-micro px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-bold">${memberCount} 👤</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function openCreateGroupModal() {
    if (!STATE.user) {
        showNotification('يجب تسجيل الدخول أولاً!');
        return;
    }
    const nameInput = document.getElementById('createGroupNameInput');
    const descInput = document.getElementById('createGroupDescInput');
    const iconInput = document.getElementById('createGroupIconInput');

    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';
    if (iconInput) iconInput.value = '👥';

    const searchInput = document.getElementById('groupMemberSearchInput');
    if (searchInput) searchInput.value = '';

    renderGroupMembersCheckboxes();
    showModal('createGroupModal');
    if (nameInput) setTimeout(() => nameInput.focus(), 150);
}

function setGroupIcon(icon) {
    const input = document.getElementById('createGroupIconInput');
    if (input) input.value = icon;
}

function renderGroupMembersCheckboxes(filterText = '') {
    const container = document.getElementById('groupMembersSelectionContainer');
    if (!container) return;

    // Filter out current user from selection list
    let availableUsers = STATE.users.filter(u => u.id !== STATE.user.id);
    if (filterText.trim()) {
        const q = filterText.trim().toLowerCase();
        availableUsers = availableUsers.filter(u => u.nickname.toLowerCase().includes(q));
    }

    if (availableUsers.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-slate-500 text-xs">
                ${filterText ? 'لا يوجد زملاء مطابقين للبحث' : 'لا يوجد زملاء آخرين مسجلين في الفصل بعد! شاركهم رابط الدخول أولاً.'}
            </div>
        `;
        return;
    }

    container.innerHTML = availableUsers.map(u => {
        const isOnline = STATE.onlineUserIds.has(u.id);
        return `
            <label class="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 cursor-pointer border border-transparent hover:border-white/5 transition-all">
                <div class="flex items-center gap-2.5 min-w-0">
                    <input type="checkbox" name="groupMemberCheckbox" value="${u.id}" onchange="updateSelectedMembersCount()" class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700 accent-purple-500">
                    <div class="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs shrink-0 overflow-hidden">
                        ${renderAvatarHTML(u.avatar)}
                    </div>
                    <span class="text-xs font-bold text-white truncate">${escapeHtml(u.nickname)}</span>
                </div>
                <span class="text-micro px-1.5 py-0.5 rounded-full ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}">
                    ${isOnline ? 'متصل' : 'غير متصل'}
                </span>
            </label>
        `;
    }).join('');

    updateSelectedMembersCount();
}

function filterGroupMembersList(val) {
    renderGroupMembersCheckboxes(val);
}

function updateSelectedMembersCount() {
    const checked = document.querySelectorAll('input[name="groupMemberCheckbox"]:checked');
    const badge = document.getElementById('selectedMembersCountBadge');
    if (badge) {
        badge.textContent = `${checked.length} مختار`;
    }
}

function toggleSelectAllGroupMembers() {
    const checkboxes = document.querySelectorAll('input[name="groupMemberCheckbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
    const btn = document.getElementById('selectAllMembersBtn');
    if (btn) {
        btn.textContent = allChecked ? 'تحديد الكل' : 'إلغاء التحديد';
    }
    updateSelectedMembersCount();
}

async function handleCreateGroupSubmit(e) {
    if (e) e.preventDefault();
    const nameInput = document.getElementById('createGroupNameInput');
    const descInput = document.getElementById('createGroupDescInput');
    const iconInput = document.getElementById('createGroupIconInput');
    const btn = document.getElementById('submitCreateGroupBtn');

    const name = nameInput ? nameInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';
    const icon = iconInput ? iconInput.value.trim() || '👥' : '👥';

    if (!name) {
        showNotification('الرجاء كتابة اسم الجروب أولاً!');
        return;
    }

    const checkedBoxes = document.querySelectorAll('input[name="groupMemberCheckbox"]:checked');
    const memberIds = Array.from(checkedBoxes).map(cb => cb.value);

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'جاري الإنشاء...';
    }

    try {
        const res = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                icon,
                description,
                creatorId: STATE.user.id,
                memberIds
            })
        });

        const data = await res.json();
        if (data.success && data.group) {
            hideModal('createGroupModal');
            showNotification(`🎉 تم إنشاء جروب "${data.group.name}" بنجاح!`);
            await loadGroups();
            selectGroupChat(data.group.id);
        } else {
            showNotification(data.error || 'فشل إنشاء الجروب');
        }
    } catch (err) {
        showNotification('حدث خطأ أثناء إنشاء الجروب');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>إنشاء الجروب</span>';
        }
    }
}

async function handleDeleteCurrentGroup() {
    const grp = STATE.activeChat.group;
    if (!grp || !STATE.user) return;

    if (!confirm(`هل أنت متأكد من حذف الجروب "${grp.name}" نهائياً من الفصل؟`)) {
        return;
    }

    try {
        const res = await fetch(`/api/groups/${grp.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: STATE.user.id })
        });
        const data = await res.json();
        if (data.success) {
            showNotification(`تم حذف الجروب "${grp.name}".`);
            await loadGroups();
            selectGeneralChat();
        } else {
            showNotification(data.error || 'تعذر حذف الجروب!');
        }
    } catch (err) {
        showNotification('حدث خطأ أثناء حذف الجروب.');
    }
}

function renderGroupLockedView(grp) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    toggleChatInputVisibility(false);

    const isPending = grp.request_status === 'pending';
    const isRejected = grp.request_status === 'rejected';

    container.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center p-6 text-center max-w-sm sm:max-w-md mx-auto my-auto">
            <div class="relative mb-4">
                <div class="w-20 h-20 rounded-3xl bg-purple-950/60 border-2 border-purple-500/40 flex items-center justify-center text-4xl shadow-2xl shadow-purple-500/10">
                    ${grp.icon || '👥'}
                </div>
                <div class="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-xs shadow-md">
                    🔒
                </div>
            </div>

            <div class="flex items-center gap-2 mb-1.5">
                <h3 class="text-base sm:text-lg font-black text-white">${escapeHtml(grp.name)}</h3>
                <span class="text-micro px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">خاص 🛡️</span>
            </div>

            <p class="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed">
                ${grp.description ? escapeHtml(grp.description) : 'هذا الجروب خاص بالأعضاء المعتمدين فقط. لا يمكنك قراءة الرسائل أو مشاهدة الأعضاء حتى يقبلك المشرف.'}
            </p>

            <div class="p-3 bg-slate-950/70 rounded-2xl border border-white/5 w-full mb-5 text-xs text-slate-300 space-y-2">
                <div class="flex justify-between items-center pb-1.5 border-b border-white/5">
                    <span class="text-slate-400">👑 منشئ الجروب:</span>
                    <span class="font-bold text-white">${escapeHtml(grp.creator_name || 'زميلك')}</span>
                </div>
                <div class="flex justify-between items-center pb-1.5 border-b border-white/5">
                    <span class="text-slate-400">👥 عدد الأعضاء:</span>
                    <span class="font-mono font-bold text-purple-400">${grp.members_count || 0}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">🛡️ حالة الانضمام:</span>
                    ${isPending ? `
                        <span class="text-amber-400 font-bold flex items-center gap-1">
                            <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                            قيد المراجعة
                        </span>
                    ` : isRejected ? `
                        <span class="text-red-400 font-bold">مرفوض ❌</span>
                    ` : `
                        <span class="text-slate-400 font-medium">غير منضم</span>
                    `}
                </div>
            </div>

            ${isPending ? `
                <div class="w-full py-3 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex flex-col items-center gap-1.5 shadow-lg shadow-amber-500/5">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                        <span>تم إرسال طلب الانضمام للمشرف!</span>
                    </div>
                    <p class="text-micro text-amber-200/70 font-normal">بمجرد موافقة ${escapeHtml(grp.creator_name || 'المشرف')}، سيفتح الشات تلقائياً هنا 🚀</p>
                </div>
            ` : isRejected ? `
                <div class="w-full space-y-2">
                    <div class="py-2.5 px-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-1.5">
                        <i data-lucide="triangle-alert" class="w-3.5 h-3.5 shrink-0"></i> رفض منشئ الجروب طلب انضمامك السابق.
                    </div>
                    <button id="sendJoinReqBtn" onclick="sendGroupJoinRequest('${grp.id}')" class="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer">
                        <i data-lucide="send" class="w-[14px] h-[14px]"></i>
                        <span>إعادة إرسال طلب انضمام</span>
                    </button>
                </div>
            ` : `
                <button id="sendJoinReqBtn" onclick="sendGroupJoinRequest('${grp.id}')" class="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 hover:from-purple-400 hover:to-pink-400 text-white font-black text-xs shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <i data-lucide="send" class="w-[14px] h-[14px]"></i>
                    <span>إرسال طلب انضمام للمشرف (Join Request)</span>
                </button>
            `}
        </div>
    `;
    renderIcons();
}

async function sendGroupJoinRequest(groupId) {
    if (!STATE.user) {
        showNotification('يجب تسجيل الدخول أولاً!');
        return;
    }
    const btn = document.getElementById('sendJoinReqBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>جاري الإرسال...</span>';
    }

    try {
        const res = await fetch(`/api/groups/${groupId}/join-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: STATE.user.id })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification(data.message || 'تم إرسال طلب الانضمام للمشرف!');
            const g = STATE.groups.find(item => item.id === groupId);
            if (g) {
                g.request_status = 'pending';
            }
            if (STATE.activeChat.type === 'group' && STATE.activeChat.group?.id === groupId) {
                STATE.activeChat.group.request_status = 'pending';
                renderGroupLockedView(STATE.activeChat.group);
            }
            renderGroupsList();
        } else {
            showNotification(data.error || 'فشل إرسال طلب الانضمام!');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>إرسال طلب انضمام</span>';
            }
        }
    } catch (err) {
        console.error('sendGroupJoinRequest error:', err);
        showNotification('حدث خطأ أثناء الاتصال بالخادم!');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>إرسال طلب انضمام</span>';
        }
    }
}

async function openGroupJoinRequestsModal() {
    const grp = STATE.activeChat.group;
    if (!grp || !STATE.user) return;

    const listEl = document.getElementById('groupJoinRequestsListContainer');
    const subtitleEl = document.getElementById('groupJoinRequestsSubtitle');
    if (subtitleEl) {
        subtitleEl.textContent = `طلبات الانضمام لجروب "${grp.name}"`;
    }
    if (listEl) {
        listEl.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs">جاري تحميل الطلبات...</div>';
    }

    showModal('groupJoinRequestsModal');
    await loadGroupJoinRequests(grp.id);
}

async function loadGroupJoinRequests(groupId) {
    if (!STATE.user) return;
    const listEl = document.getElementById('groupJoinRequestsListContainer');
    try {
        const res = await fetch(`/api/groups/${groupId}/join-requests?userId=${encodeURIComponent(STATE.user.id)}`);
        const data = await res.json();
        if (!res.ok) {
            if (listEl) listEl.innerHTML = `<div class="text-center py-4 text-red-400 text-xs">${data.error || 'تعذر تحميل الطلبات!'}</div>`;
            return;
        }

        const requests = data.requests || [];
        const reqBadge = document.getElementById('groupHeaderJoinRequestsCount');
        const reqBtn = document.getElementById('groupHeaderJoinRequestsBtn');
        if (reqBadge) reqBadge.textContent = requests.length;
        if (reqBtn) {
            if (requests.length > 0) reqBtn.classList.remove('hidden');
        }
        if (STATE.activeChat.type === 'group' && STATE.activeChat.group?.id === groupId) {
            STATE.activeChat.group.pending_requests_count = requests.length;
        }

        if (requests.length === 0) {
            if (listEl) {
                listEl.innerHTML = `
                    <div class="text-center py-8 text-slate-400 text-xs">
                        <span class="text-3xl block mb-2">🎉</span>
                        <p class="font-bold text-white mb-1">لا توجد طلبات انضمام معلقة</p>
                        <p class="text-micro text-slate-500">سيظهر هنا أي زميل يطلب الانضمام لهذا الجروب للموافقة عليه أو رفضه.</p>
                    </div>
                `;
            }
            return;
        }

        if (listEl) {
            listEl.innerHTML = requests.map(r => `
                <div id="join-request-row-${r.id}" class="p-3 rounded-2xl bg-slate-900/80 border border-white/5 flex flex-col gap-2.5">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-sm shrink-0 overflow-hidden">
                                ${renderAvatarHTML(r.avatar || r.user_avatar)}
                            </div>
                            <div class="min-w-0">
                                <h5 class="text-xs font-bold text-white truncate">${escapeHtml(r.nickname || r.user_name)}</h5>
                                <span class="text-micro text-slate-400">طلب الانضمام: ${new Date(r.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 pt-1 border-t border-white/5">
                        <button onclick="handleRespondJoinRequest('${groupId}', '${r.id}', 'accept')" class="flex-1 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                            <span>✅ قبول</span>
                        </button>
                        <button onclick="handleRespondJoinRequest('${groupId}', '${r.id}', 'reject')" class="flex-1 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                            <span>❌ رفض</span>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('loadGroupJoinRequests error:', err);
        if (listEl) listEl.innerHTML = '<div class="text-center py-4 text-red-400 text-xs">تعذر تحميل الطلبات!</div>';
    }
}

async function handleRespondJoinRequest(groupId, requestId, action) {
    if (!STATE.user) return;
    const rowEl = document.getElementById(`join-request-row-${requestId}`);
    if (rowEl) {
        rowEl.style.opacity = '0.5';
        rowEl.style.pointerEvents = 'none';
    }

    try {
        const res = await fetch(`/api/groups/${groupId}/join-requests/${requestId}/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: STATE.user.id,
                action: action
            })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification(action === 'accept' ? '✅ تم قبول الزميل في الجروب بنجاح!' : '❌ تم رفض طلب الانضمام.');
            await loadGroupJoinRequests(groupId);
            await loadGroups();
        } else {
            showNotification(data.error || 'حدث خطأ أثناء معالجة الطلب');
            if (rowEl) {
                rowEl.style.opacity = '1';
                rowEl.style.pointerEvents = 'auto';
            }
        }
    } catch (err) {
        console.error('handleRespondJoinRequest error:', err);
        showNotification('حدث خطأ في الاتصال بالخادم');
        if (rowEl) {
            rowEl.style.opacity = '1';
            rowEl.style.pointerEvents = 'auto';
        }
    }
}

async function openGroupMembersModal() {
    const grp = STATE.activeChat.group;
    if (!grp) return;
    if (!grp.is_member) {
        showNotification('🔒 لا يمكنك عرض الأعضاء لأنك لست عضواً في هذا الجروب!');
        return;
    }

    const iconEl = document.getElementById('groupInfoModalIcon');
    const titleEl = document.getElementById('groupInfoModalTitle');
    const descEl = document.getElementById('groupInfoModalDesc');
    const listEl = document.getElementById('groupMembersListModalContainer');

    if (iconEl) iconEl.textContent = grp.icon || '👥';
    if (titleEl) titleEl.textContent = grp.name;
    if (descEl) descEl.textContent = grp.description || `أنشئ بواسطة: ${grp.creator_name || 'زميلك'}`;

    if (listEl) {
        listEl.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs">جاري تحميل الأعضاء...</div>';
    }

    showModal('groupMembersModal');

    try {
        const uId = STATE.user ? STATE.user.id : '';
        const res = await fetch(`/api/groups/${grp.id}/members?userId=${encodeURIComponent(uId)}`);
        const data = await res.json();
        const members = data.members || [];

        if (listEl) {
            listEl.innerHTML = members.map(m => {
                const isOnline = STATE.onlineUserIds.has(m.id);
                const isCreator = m.group_role === 'creator';
                return `
                    <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-white/5">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs shrink-0 overflow-hidden">
                                ${renderAvatarHTML(m.avatar)}
                            </div>
                            <div class="min-w-0">
                                <h5 class="text-xs font-bold text-white truncate">${escapeHtml(m.nickname)}</h5>
                                <span class="text-micro text-purple-300 font-bold">${isCreator ? 'مؤسس الجروب 👑' : 'عضو في الجروب'}</span>
                            </div>
                        </div>
                        <span class="text-micro px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}">
                            ${isOnline ? 'متصل' : 'أوفلاين'}
                        </span>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        if (listEl) listEl.innerHTML = '<div class="text-center py-4 text-red-400 text-xs">تعذر تحميل الأعضاء!</div>';
    }
}

// ----------------------------------------------------
// 5. Messages Feed & Actions
// ----------------------------------------------------
async function loadMessages() {
    if (STATE.activeChat.type === 'group' && STATE.activeChat.group) {
        if (!STATE.activeChat.group.is_member) {
            renderGroupLockedView(STATE.activeChat.group);
            return;
        }
    }
    toggleChatInputVisibility(true);

    try {
        const params = new URLSearchParams({
            chat_type: STATE.activeChat.type,
            user_id: STATE.user ? STATE.user.id : ''
        });
        if (STATE.activeChat.type === 'direct' && STATE.activeChat.recipient) {
            params.append('recipient_id', STATE.activeChat.recipient.id);
        }
        if (STATE.activeChat.type === 'group' && STATE.activeChat.group) {
            params.append('group_id', STATE.activeChat.group.id);
        }

        const res = await fetch(`/api/messages?${params.toString()}`);
        if (res.status === 403) {
            const errData = await res.json().catch(() => ({}));
            if (STATE.activeChat.group) {
                STATE.activeChat.group.is_member = false;
                if (errData.request_status) {
                    STATE.activeChat.group.request_status = errData.request_status;
                }
                renderGroupLockedView(STATE.activeChat.group);
            }
            return;
        }
        const data = await res.json();
        STATE.messages = Array.isArray(data) ? data : [];
        renderMessagesFeed();
        scrollToBottom();
    } catch (e) {
        console.error('Failed to load messages:', e);
    }
}

function renderMessagesFeed() {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    if (STATE.messages.length === 0) {
        container.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-12">
                <span class="text-4xl mb-2">💬</span>
                <span>لا توجد رسائل سابقة هنا. ابدأ الشات أو ارمي ميم جامد!</span>
            </div>
        `;
        return;
    }

    container.innerHTML = STATE.messages.map(m => formatMessageHTML(m)).join('');

    // Schedule client-side disappearing timers for 2s / fast burn messages
    STATE.messages.forEach(m => {
        if (m.is_disappearing && m.expires_at) {
            const ms = new Date(m.expires_at).getTime() - Date.now();
            if (ms > 0) {
                setTimeout(() => {
                    const el = document.getElementById(`msg-${m.id}`);
                    if (el) {
                        el.classList.add('transition-all', 'duration-500', 'opacity-0', 'scale-90', 'blur-sm');
                        setTimeout(() => el.remove(), 500);
                    }
                }, ms);
            }
        }
    });
}

function formatMessageHTML(m) {
    const isMe = STATE.user && m.sender_id === STATE.user.id;
    const canDelete = isMe || (STATE.user && STATE.user.role === 'admin') || (STATE.networkInfo && STATE.networkInfo.isHostAdmin);
    const time = new Date(m.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const isDirectChat = m.chat_type === 'direct' || STATE.activeChat?.type === 'direct';
    const readCheckHTML = (isMe && isDirectChat)
        ? `<span class="msg-read-check text-[11px] font-bold ${m.is_read ? 'text-cyan-400' : 'text-slate-400'}" title="${m.is_read ? 'تمت القراءة (سين) ✓✓' : 'تم الإرسال ✓'}">${m.is_read ? '✓✓' : '✓'}</span>`
        : '';

    let mediaHTML = '';
    if (m.media_url) {
        if (m.media_type === 'image') {
            mediaHTML = `<div class="mt-2 rounded-xl overflow-hidden max-w-xs cursor-pointer border border-white/10" onclick="window.open('${m.media_url}', '_blank')"><img src="${m.media_url}" class="w-full object-cover max-h-60" /></div>`;
        } else if (m.media_type === 'video') {
            mediaHTML = `<div class="mt-2 rounded-xl overflow-hidden max-w-xs border border-white/10"><video src="${m.media_url}" controls class="w-full max-h-60 rounded-xl"></video></div>`;
        } else if (m.media_type === 'audio') {
            mediaHTML = `
                <div class="mt-2 flex items-center gap-2 bg-slate-950/40 p-2 rounded-xl border border-white/10 min-w-[200px]">
                    <button onclick="toggleAudioPlay('${m.id}', '${m.media_url}')" id="audio-btn-${m.id}" class="w-8 h-8 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold text-xs">▶</button>
                    <div class="flex-1">
                        <div class="flex items-center gap-1 h-4">
                            <span class="voice-bar h-2"></span>
                            <span class="voice-bar h-4"></span>
                            <span class="voice-bar h-3"></span>
                            <span class="voice-bar h-5"></span>
                            <span class="voice-bar h-2"></span>
                            <span class="voice-bar h-4"></span>
                        </div>
                        <span class="text-micro text-slate-400">ملاحظة صوتية 🎙️</span>
                    </div>
                </div>
            `;
        } else {
            mediaHTML = `
                <a href="${m.media_url}" download="${m.media_name || 'file'}" class="mt-2 flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/40 border border-white/10 hover:border-cyan-500/40 transition-all text-xs">
                    <span class="text-xl">📁</span>
                    <div class="flex-1 truncate">
                        <p class="font-bold text-white truncate">${escapeHtml(m.media_name || 'ملف مرفق')}</p>
                        <p class="text-micro text-slate-400">${(m.media_size / 1024).toFixed(1)} KB</p>
                    </div>
                    <span class="text-cyan-400 font-bold">📥</span>
                </a>
            `;
        }
    }

    const disappearingBadge = m.is_disappearing ? `
        <span class="inline-flex items-center gap-1 text-micro px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 burn-pulse">
            🔥 تدمير ذاتي
        </span>
    ` : '';

    const reactionsHTML = renderReactionsPills(m.id, m.reactions || []);

    let codeSnippetHTML = '';
    if (m.media_type === 'code') {
        const langOrTitle = escapeHtml(m.media_name || 'Code Snippet');
        codeSnippetHTML = `
            <div class="mt-1.5 rounded-xl overflow-hidden border border-cyan-500/30 bg-[#070b16] max-w-full shadow-lg">
                <div class="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-white/10 text-xs gap-3">
                    <div class="flex items-center gap-1.5 font-mono text-cyan-400 font-bold truncate">
                        <span>&lt;/&gt;</span>
                        <span class="truncate">${langOrTitle}</span>
                    </div>
                    <button onclick="copySnippetCode('${m.id}', this)" class="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-bold text-[11px] transition-all" title="نسخ الكود للحافظة">
                        <span>📋</span>
                        <span>نسخ الكود</span>
                    </button>
                </div>
                <pre id="code-content-${m.id}" class="p-3 text-xs font-mono text-cyan-200 overflow-x-auto whitespace-pre leading-relaxed select-all text-left" dir="ltr"><code>${escapeHtml(m.content || '')}</code></pre>
            </div>
        `;
    }

    return `
        <div id="msg-${m.id}" class="flex gap-2.5 my-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} group">
            <div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shrink-0 overflow-hidden">
                ${renderAvatarHTML(m.sender_avatar)}
            </div>
            <div class="max-w-[78%] md:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                <div class="flex items-center gap-2 mb-1 px-1">
                    <span class="text-[11px] font-bold text-slate-300">${isMe ? 'أنت' : escapeHtml(m.sender_name)}</span>
                    ${m.sender_role === 'admin' ? '<span class="text-micro px-1 rounded bg-amber-500/20 text-amber-400 font-black">👑 الأدمن</span>' : ''}
                    ${disappearingBadge}
                    <span class="text-micro text-slate-500 en-text inline-flex items-center gap-1">${time} ${readCheckHTML}</span>
                </div>
                
                <div class="relative px-3.5 py-2.5 text-sm ${isMe ? 'chat-bubble-outgoing' : 'chat-bubble-incoming'}">
                    ${m.media_type === 'code' ? codeSnippetHTML : (m.content ? `<p class="whitespace-pre-wrap leading-relaxed">${escapeHtml(m.content)}</p>` : '')}
                    ${mediaHTML}
                </div>

                <!-- Reactions List -->
                <div id="reactions-${m.id}" class="flex flex-wrap gap-1 mt-1 px-1">
                    ${reactionsHTML}
                </div>

                <!-- Quick Reaction Trigger Buttons (on hover) -->
                <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-full px-2 py-0.5 mt-1 shadow-lg text-xs">
                    <button onclick="toggleReaction('${m.id}', '❤️')" class="hover:scale-125 transition-transform">❤️</button>
                    <button onclick="toggleReaction('${m.id}', '😂')" class="hover:scale-125 transition-transform">😂</button>
                    <button onclick="toggleReaction('${m.id}', '🔥')" class="hover:scale-125 transition-transform">🔥</button>
                    <button onclick="toggleReaction('${m.id}', '😮')" class="hover:scale-125 transition-transform">😮</button>
                    <button onclick="toggleReaction('${m.id}', '👏')" class="hover:scale-125 transition-transform">👏</button>
                    ${canDelete ? `<button onclick="deleteChatMessage('${m.id}')" class="text-red-400 font-bold ml-1 hover:text-red-300 hover:scale-125 transition-all" title="${isMe ? 'حذف رسالتي للجميع' : 'حذف الرسالة (صلاحية أدمن)'}">🗑️</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderReactionsPills(messageId, reactions) {
    if (!reactions || reactions.length === 0) return '';
    const counts = {};
    reactions.forEach(r => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });

    return Object.entries(counts).map(([emoji, count]) => `
        <button onclick="toggleReaction('${messageId}', '${emoji}')" class="inline-flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-full px-2 py-0.5 text-[11px] text-slate-200 transition-all">
            <span>${emoji}</span>
            <span class="text-micro font-bold text-slate-400">${count}</span>
        </button>
    `).join('');
}

function appendMessageBubble(message) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.innerHTML = formatMessageHTML(message);
    container.appendChild(div.firstElementChild);

    // Auto-schedule self-destruction for fast burn disappearing messages (e.g. 2s)
    if (message.is_disappearing && message.expires_at) {
        const ms = new Date(message.expires_at).getTime() - Date.now();
        if (ms > 0) {
            setTimeout(() => {
                const el = document.getElementById(`msg-${message.id}`);
                if (el) {
                    el.classList.add('transition-all', 'duration-500', 'opacity-0', 'scale-90', 'blur-sm');
                    setTimeout(() => el.remove(), 500);
                }
            }, ms);
        }
    }
}

async function deleteChatMessage(messageId) {
    if (!confirm('هل تريد حذف هذه الرسالة نهائياً للجميع؟')) return;
    if (STATE.socket) {
        STATE.socket.emit('delete_message', {
            messageId,
            userId: STATE.user ? STATE.user.id : null
        });
    }
    try {
        await fetch(`/api/messages/${messageId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: STATE.user ? STATE.user.id : null })
        });
    } catch (e) {}
}

function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

async function handleSendMessage(e) {
    if (e) e.preventDefault();
    if (STATE.isChatLocked && STATE.user.role !== 'admin') {
        alert('الشات مقفول مؤقتاً بوضع التركيز!');
        return;
    }

    if (STATE.activeChat.type === 'group' && STATE.activeChat.group && !STATE.activeChat.group.is_member) {
        showNotification('🔒 هذا الجروب مغلق! لا يمكنك إرسال رسائل قبل قبول طلب انضمامك.');
        return;
    }

    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    if (!content) return;

    input.value = '';
    sendChatMessagePayload({ content });
}

function sendChatMessagePayload({ content = '', mediaUrl = null, mediaType = 'text', mediaName = null, mediaSize = 0 }) {
    if (!STATE.socket || !STATE.user) return;

    if (STATE.activeChat.type === 'group' && STATE.activeChat.group && !STATE.activeChat.group.is_member) {
        showNotification('🔒 هذا الجروب مغلق! لا يمكنك إرسال رسائل قبل قبول طلب انضمامك.');
        return;
    }

    let recipientId = null;
    if (STATE.activeChat.type === 'direct') {
        recipientId = STATE.activeChat.recipient?.id;
    } else if (STATE.activeChat.type === 'group') {
        recipientId = STATE.activeChat.group?.id;
    }

    STATE.socket.emit('send_message', {
        senderId: STATE.user.id,
        recipientId,
        chatType: STATE.activeChat.type,
        role: STATE.user.role,
        content,
        mediaUrl,
        mediaType,
        mediaName,
        mediaSize,
        disappearingSeconds: STATE.disappearingSeconds
    });

    STATE.socket.emit('typing_stop', { userId: STATE.user.id });
}

function toggleReaction(messageId, emoji) {
    if (!STATE.socket || !STATE.user) return;
    STATE.socket.emit('toggle_reaction', {
        messageId,
        userId: STATE.user.id,
        emoji
    });
}

function renderMessageReactions(messageId, reactions) {
    const target = document.getElementById(`reactions-${messageId}`);
    if (target) {
        target.innerHTML = renderReactionsPills(messageId, reactions);
    }
}

// ----------------------------------------------------
// 6. Voice Notes Recorder (WhatsApp Style 🎙️)
// ----------------------------------------------------
async function toggleVoiceRecording() {
    const btn = document.getElementById('voiceRecordBtn');
    const banner = document.getElementById('voiceRecordBanner');
    const timerEl = document.getElementById('voiceTimerText');

    if (STATE.voiceRecorder.mediaRecorder && STATE.voiceRecorder.mediaRecorder.state === 'recording') {
        // Stop & Send
        STATE.voiceRecorder.mediaRecorder.stop();
        clearInterval(STATE.voiceRecorder.interval);
        banner.classList.add('hidden');
        btn.classList.remove('bg-red-500', 'text-white', 'animate-pulse');
        return;
    }

    // Start Recording
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        STATE.voiceRecorder.mediaRecorder = mediaRecorder;
        STATE.voiceRecorder.audioChunks = [];
        STATE.voiceRecorder.seconds = 0;

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) STATE.voiceRecorder.audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(STATE.voiceRecorder.audioChunks, { type: 'audio/webm' });
            stream.getTracks().forEach(t => t.stop());

            const formData = new FormData();
            formData.append('audio', audioBlob, `voice_${Date.now()}.webm`);

            try {
                const res = await fetch('/api/upload/audio', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) {
                    sendChatMessagePayload({
                        mediaUrl: data.url,
                        mediaType: 'audio',
                        mediaName: data.name,
                        mediaSize: data.size
                    });
                }
            } catch (err) {
                alert('فشل رفع التسجيل الصوتي!');
            }
        };

        mediaRecorder.start();
        banner.classList.remove('hidden');
        btn.classList.add('bg-red-500', 'text-white', 'animate-pulse');

        STATE.voiceRecorder.interval = setInterval(() => {
            STATE.voiceRecorder.seconds++;
            const mins = String(Math.floor(STATE.voiceRecorder.seconds / 60)).padStart(2, '0');
            const secs = String(STATE.voiceRecorder.seconds % 60).padStart(2, '0');
            timerEl.textContent = `${mins}:${secs}`;
        }, 1000);

    } catch (e) {
        alert('يرجى السماح بالوصول للمايكروفون لتسجيل الصوت!');
    }
}

function cancelVoiceRecording() {
    if (STATE.voiceRecorder.mediaRecorder) {
        STATE.voiceRecorder.mediaRecorder.onstop = null;
        STATE.voiceRecorder.mediaRecorder.stop();
        clearInterval(STATE.voiceRecorder.interval);
        document.getElementById('voiceRecordBanner').classList.add('hidden');
        document.getElementById('voiceRecordBtn').classList.remove('bg-red-500', 'text-white', 'animate-pulse');
    }
}

let activeAudio = null;
function toggleAudioPlay(id, url) {
    const btn = document.getElementById(`audio-btn-${id}`);
    if (activeAudio && activeAudio.id === id) {
        if (activeAudio.audio.paused) {
            activeAudio.audio.play();
            btn.textContent = '⏸';
        } else {
            activeAudio.audio.pause();
            btn.textContent = '▶';
        }
        return;
    }

    if (activeAudio) {
        activeAudio.audio.pause();
        const prevBtn = document.getElementById(`audio-btn-${activeAudio.id}`);
        if (prevBtn) prevBtn.textContent = '▶';
    }

    const audio = new Audio(url);
    activeAudio = { id, audio };
    audio.play();
    btn.textContent = '⏸';

    audio.onended = () => {
        btn.textContent = '▶';
        activeAudio = null;
    };
}

// ----------------------------------------------------
// 7. Instagram Stories Carousel & Viewer
// ----------------------------------------------------
async function loadStories() {
    try {
        const res = await fetch(`/api/stories?userId=${STATE.user ? STATE.user.id : ''}`);
        const data = await res.json();
        STATE.stories = data;
        renderStoriesBar();
    } catch (e) {
        console.error('Failed to load stories:', e);
    }
}

function renderStoriesBar() {
    const container = document.getElementById('storiesList');
    if (!container) return;

    let html = `
        <!-- Add Story Button -->
        <div onclick="openStoryCreator()" class="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0">
            <div class="relative w-14 h-14 rounded-full bg-slate-800 border-2 border-dashed border-cyan-500 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                <span>➕</span>
            </div>
            <span class="text-[11px] font-semibold text-slate-300">استوري جديد</span>
        </div>
    `;

    STATE.stories.forEach(authorGroup => {
        const ringClass = authorGroup.hasUnseen ? 'story-ring-unseen' : 'story-ring-seen';
        html += `
            <div onclick="viewUserStories('${authorGroup.userId}')" class="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0">
                <div class="${ringClass} w-14 h-14 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <div class="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-2xl border-2 border-slate-950 overflow-hidden">
                        ${renderAvatarHTML(authorGroup.authorAvatar)}
                    </div>
                </div>
                <span class="text-[11px] font-semibold text-slate-300 truncate max-w-[65px]">${escapeHtml(authorGroup.authorName)}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

let activeStoryIndex = 0;
let currentViewingGroup = null;

function viewUserStories(userId) {
    const group = STATE.stories.find(g => g.userId === userId);
    if (!group || group.stories.length === 0) return;

    currentViewingGroup = group;
    activeStoryIndex = 0;
    renderCurrentStory();
    showModal('storyViewerModal');
}

function renderCurrentStory() {
    if (!currentViewingGroup) return;
    const story = currentViewingGroup.stories[activeStoryIndex];
    if (!story) return;

    // Mark viewed
    if (STATE.user) {
        fetch(`/api/stories/${story.id}/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: STATE.user.id })
        });
    }

    const avatarEl = document.getElementById('storyViewerAvatar');
    const nameEl = document.getElementById('storyViewerName');
    const contentEl = document.getElementById('storyViewerBody');

    if (avatarEl) avatarEl.innerHTML = renderAvatarHTML(currentViewingGroup.authorAvatar);
    if (nameEl) nameEl.textContent = currentViewingGroup.authorName;
    updateStoryViewsDisplay(story.views_count || 1);

    // Fetch fresh live views count from server
    fetch(`/api/stories/${story.id}/views`).then(r => r.json()).then(data => {
        if (data.viewers) {
            updateStoryViewsDisplay(data.viewers.length);
        }
    }).catch(() => {});

    if (story.media_type === 'image') {
        contentEl.innerHTML = `
            <div class="relative w-full h-[70vh] sm:h-[75vh] max-h-[680px] rounded-3xl overflow-hidden bg-black flex items-center justify-center border border-white/10 shadow-2xl">
                <img src="${story.media_url}" class="w-full h-full object-contain" />
                ${story.text_content ? `
                    <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-5 text-center text-white font-bold text-sm sm:text-base leading-snug drop-shadow-md">
                        ${escapeHtml(story.text_content)}
                    </div>
                ` : ''}
            </div>
        `;
    } else if (story.media_type === 'video') {
        contentEl.innerHTML = `
            <div class="relative w-full h-[70vh] sm:h-[75vh] max-h-[680px] rounded-3xl overflow-hidden bg-black flex items-center justify-center border border-white/10 shadow-2xl">
                <video src="${story.media_url}" autoplay playsinline controls class="w-full h-full object-contain rounded-3xl"></video>
            </div>
        `;
    } else {
        contentEl.innerHTML = `
            <div class="w-full h-[70vh] sm:h-[75vh] max-h-[680px] rounded-3xl bg-gradient-to-tr ${story.bg_gradient || 'from-indigo-600 to-pink-500'} flex items-center justify-center p-8 text-center text-white text-2xl font-black shadow-2xl leading-relaxed">
                ${escapeHtml(story.text_content)}
            </div>
        `;
    }

    // Story Delete Button Permission Check (Owner or Admin/Host)
    const deleteBtn = document.getElementById('deleteStoryBtn');
    if (deleteBtn) {
        const isOwner = STATE.user && story.user_id === STATE.user.id;
        const isAdmin = (STATE.user && STATE.user.role === 'admin') || (STATE.networkInfo && STATE.networkInfo.isHostAdmin);
        if (isOwner || isAdmin) {
            deleteBtn.classList.remove('hidden');
            deleteBtn.title = isOwner ? 'حذف الاستوري الخاص بي 🗑️' : 'حذف الاستوري (صلاحية الأدمن / المضيف) 👑';
        } else {
            deleteBtn.classList.add('hidden');
        }
    }
}

async function deleteCurrentActiveStory() {
    if (!currentViewingGroup) return;
    const story = currentViewingGroup.stories[activeStoryIndex];
    if (!story) return;

    if (!confirm('هل أنت متأكد من حذف هذا الاستوري نهائياً؟')) return;

    try {
        const res = await fetch(`/api/stories/${story.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: STATE.user ? STATE.user.id : null })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('تم حذف الاستوري بنجاح! 🗑️');
            currentViewingGroup.stories.splice(activeStoryIndex, 1);
            if (currentViewingGroup.stories.length === 0) {
                hideModal('storyViewerModal');
            } else {
                if (activeStoryIndex >= currentViewingGroup.stories.length) {
                    activeStoryIndex = currentViewingGroup.stories.length - 1;
                }
                renderCurrentStory();
            }
            loadStories();
        } else {
            alert(data.error || 'فشل حذف الاستوري');
        }
    } catch (e) {
        alert('حدث خطأ أثناء حذف الاستوري');
    }
}

function nextStory() {
    if (!currentViewingGroup) return;
    if (activeStoryIndex < currentViewingGroup.stories.length - 1) {
        activeStoryIndex++;
        renderCurrentStory();
    } else {
        hideModal('storyViewerModal');
    }
}

function prevStory() {
    if (!currentViewingGroup) return;
    if (activeStoryIndex > 0) {
        activeStoryIndex--;
        renderCurrentStory();
    }
}

function updateStoryViewsDisplay(count) {
    const badge = document.getElementById('storyViewersBadge');
    const bottomLabel = document.getElementById('storyViewersBottomBtnText');
    const displayCount = count !== undefined ? count : 1;
    if (badge) { badge.innerHTML = `<i data-lucide="eye" class="w-3 h-3"></i> ${displayCount} مشاهدة`; renderIcons(); }
    if (bottomLabel) bottomLabel.textContent = `المشاهدات (${displayCount}) • اضغط لرؤية من شاهد الاستوري`;
}

// 7b. Story Viewers Modal (👀 مين شاف الاستوري)
async function openStoryViewsModal() {
    if (!currentViewingGroup) return;
    const story = currentViewingGroup.stories[activeStoryIndex];
    if (!story) return;

    const listEl = document.getElementById('storyViewersList');
    const countEl = document.getElementById('storyViewsModalCount');
    if (!listEl) return;

    listEl.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs">جاري تحميل المشاهدات...</div>`;
    showModal('storyViewsModal');

    try {
        const res = await fetch(`/api/stories/${story.id}/views`);
        const data = await res.json();
        const viewers = data.viewers || [];

        if (countEl) countEl.textContent = viewers.length;
        updateStoryViewsDisplay(viewers.length);

        if (viewers.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-8 text-slate-500">
                    <span class="text-3xl block mb-2">👻</span>
                    <p class="text-xs font-bold text-slate-400">لم يشاهد أحد هذا الاستوري بعد</p>
                </div>
            `;
            return;
        }

        let html = '';
        viewers.forEach(v => {
            const timeAgo = formatTimeAgo(v.viewed_at);
            html += `
                <div class="flex items-center justify-between p-2 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            ${renderAvatarHTML(v.avatar)}
                        </div>
                        <div>
                            <div class="flex items-center gap-1.5">
                                <span class="text-xs font-bold text-white">${escapeHtml(v.nickname)}</span>
                                ${v.role === 'admin' ? '<span class="text-micro px-1 rounded bg-amber-500/20 text-amber-400 font-black">👑 أدمن</span>' : ''}
                            </div>
                            <span class="text-micro text-slate-400 block">${timeAgo}</span>
                        </div>
                    </div>
                    <span class="text-cyan-400 text-xs font-mono">👁️</span>
                </div>
            `;
        });
        listEl.innerHTML = html;
    } catch (err) {
        listEl.innerHTML = `<div class="text-center py-6 text-red-400 text-xs">فشل تحميل المشاهدات!</div>`;
    }
}

function formatTimeAgo(dateString) {
    if (!dateString) return 'الآن';
    const diffSeconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diffSeconds < 60) return 'الآن';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return new Date(dateString).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function openStoryCreator() {
    showModal('storyCreatorModal');
}

async function handleCreateStorySubmit(e) {
    e.preventDefault();
    const text = document.getElementById('storyTextInput').value.trim();
    const file = document.getElementById('storyFileInput').files[0];
    const gradient = document.querySelector('input[name="storyGradient"]:checked')?.value || 'from-purple-600 to-pink-500';

    if (!text && !file) {
        alert('اكتب نص الاستوري أو ارفع صورة/فيديو!');
        return;
    }

    const formData = new FormData();
    formData.append('userId', STATE.user.id);
    formData.append('text_content', text);
    formData.append('bg_gradient', gradient);
    if (file) formData.append('file', file);

    try {
        const res = await fetch('/api/stories', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            hideModal('storyCreatorModal');
            document.getElementById('storyTextInput').value = '';
            removeStorySelectedFile();
            loadStories();
            showNotification('تم نشر الاستوري بنجاح! 🔥');
        }
    } catch (e) {
        alert('فشل نشر الاستوري!');
    }
}

function removeStorySelectedFile() {
    const input = document.getElementById('storyFileInput');
    if (input) input.value = '';
    const img = document.getElementById('storyImagePreview');
    if (img) img.src = '';
    const emptyState = document.getElementById('storyFileEmptyState');
    const previewState = document.getElementById('storyFilePreviewState');
    if (emptyState) emptyState.classList.remove('hidden');
    if (previewState) previewState.classList.add('hidden');
}

// ----------------------------------------------------
// 8. Classroom AirDrop
// ----------------------------------------------------
async function loadAirDropFiles() {
    try {
        const res = await fetch('/api/airdrop/files');
        const files = await res.json();
        STATE.airdropFiles = files;
        renderAirDropList();
    } catch (e) {
        console.error('Failed to load airdrop:', e);
    }
}

function renderAirDropList() {
    const container = document.getElementById('airdropFilesList');
    if (!container) return;

    if (STATE.airdropFiles.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs">لا توجد ملفات مرفوعة على AirDrop بعد. اسحب ملفك وشاركه الآن!</div>`;
        return;
    }

    container.innerHTML = STATE.airdropFiles.map(f => `
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/30 transition-all">
            <div class="flex items-center gap-3">
                <i data-lucide="package" class="w-5 h-5 text-cyan-400 shrink-0"></i>
                <div>
                    <h4 class="text-sm font-bold text-white truncate max-w-xs">${escapeHtml(f.file_name)}</h4>
                    <p class="text-[11px] text-slate-400">بواسطة: ${escapeHtml(f.sender_name)} • ${(f.file_size / (1024*1024)).toFixed(2)} MB</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <span id="airdrop-dl-${f.id}" class="text-xs text-slate-400 flex items-center gap-1"><i data-lucide="download" class="w-3 h-3"></i> ${f.downloads_count || 0}</span>
                <a href="${f.file_url}" download="${f.file_name}" onclick="recordAirDropDownload('${f.id}')" class="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all flex items-center gap-1">
                    <span>تحميل فوري</span>
                    <i data-lucide="zap" class="w-3 h-3"></i>
                </a>
            </div>
        </div>
    `).join('');
    renderIcons();
}

async function recordAirDropDownload(id) {
    try {
        await fetch(`/api/airdrop/download/${id}`, { method: 'POST' });
    } catch (e) {}
}

async function handleAirDropUpload(file) {
    if (!file || !STATE.user) return;
    const formData = new FormData();
    formData.append('senderId', STATE.user.id);
    formData.append('file', file);

    const progressEl = document.getElementById('airdropUploadProgress');
    if (progressEl) progressEl.classList.remove('hidden');

    try {
        const res = await fetch('/api/airdrop/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            showNotification('تم رفع الملف على Classroom AirDrop بنجاح! 🚀');
        }
    } catch (e) {
        alert('فشل رفع الملف!');
    } finally {
        if (progressEl) progressEl.classList.add('hidden');
    }
}

// ----------------------------------------------------
// 9. Live Collaborative Whiteboard (سبورة الفصل الحية 🎨)
// ----------------------------------------------------
function resizeWhiteboardCanvas() {
    const canvas = STATE.whiteboard.canvas;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const w = parent.clientWidth || 900;
    const h = parent.clientHeight || 550;

    if (w <= 0 || h <= 0) return;

    if (canvas.width !== w || canvas.height !== h) {
        let prevImage = null;
        if (canvas.width > 0 && canvas.height > 0) {
            try {
                prevImage = STATE.whiteboard.ctx.getImageData(0, 0, canvas.width, canvas.height);
            } catch(e) {}
        }

        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        STATE.whiteboard.ctx = ctx;

        ctx.fillStyle = '#070a13';
        ctx.fillRect(0, 0, w, h);

        if (prevImage) {
            try {
                ctx.putImageData(prevImage, 0, 0);
            } catch(e) {}
        }

        if (STATE.socket) {
            STATE.socket.emit('request_whiteboard_history');
        }
    }
}

function initWhiteboard() {
    const canvas = document.getElementById('whiteboardCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    STATE.whiteboard.canvas = canvas;
    STATE.whiteboard.ctx = ctx;

    canvas.width = 900;
    canvas.height = 550;
    ctx.fillStyle = '#070a13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    window.addEventListener('resize', () => {
        const modal = document.getElementById('whiteboardModal');
        if (modal && !modal.classList.contains('hidden')) {
            resizeWhiteboardCanvas();
        }
    });

    // Mouse & Touch events
    const startDraw = (e) => {
        STATE.whiteboard.drawing = true;
        const pos = getCanvasPos(e);
        STATE.whiteboard.lastX = pos.x;
        STATE.whiteboard.lastY = pos.y;
    };

    const drawMove = (e) => {
        if (!STATE.whiteboard.drawing) return;
        const pos = getCanvasPos(e);
        const drawData = {
            x0: STATE.whiteboard.lastX,
            y0: STATE.whiteboard.lastY,
            x1: pos.x,
            y1: pos.y,
            color: STATE.whiteboard.mode === 'eraser' ? '#070a13' : STATE.whiteboard.color,
            size: STATE.whiteboard.mode === 'eraser' ? STATE.whiteboard.brushSize * 5 : STATE.whiteboard.brushSize
        };

        drawStrokeOnCanvas(drawData);

        if (STATE.socket) {
            STATE.socket.emit('whiteboard_draw_step', drawData);
        }

        STATE.whiteboard.lastX = pos.x;
        STATE.whiteboard.lastY = pos.y;
    };

    const stopDraw = () => {
        STATE.whiteboard.drawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', drawMove);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); drawMove(e); }, { passive: false });
    canvas.addEventListener('touchend', (e) => { e.preventDefault(); stopDraw(); }, { passive: false });

    // Socket drawing receiver
    if (STATE.socket) {
        STATE.socket.on('whiteboard_draw_step', (drawData) => {
            drawStrokeOnCanvas(drawData);
        });

        STATE.socket.on('whiteboard_init', (history) => {
            if (Array.isArray(history)) {
                history.forEach(stroke => drawStrokeOnCanvas(stroke));
            }
        });

        STATE.socket.on('whiteboard_cleared', () => {
            clearLocalCanvas();
        });
    }
}

function getCanvasPos(e) {
    const canvas = STATE.whiteboard.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (clientX === undefined && e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (clientX === undefined && e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    }

    return {
        x: ((clientX !== undefined ? clientX : 0) - rect.left) * scaleX,
        y: ((clientY !== undefined ? clientY : 0) - rect.top) * scaleY
    };
}

function drawStrokeOnCanvas({ x0, y0, x1, y1, color, size }) {
    const ctx = STATE.whiteboard.ctx;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.closePath();
}

function clearLocalCanvas() {
    const canvas = STATE.whiteboard.canvas;
    const ctx = STATE.whiteboard.ctx;
    if (canvas && ctx) {
        ctx.fillStyle = '#070a13';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function emitClearWhiteboard() {
    if (STATE.socket) {
        STATE.socket.emit('whiteboard_clear_board');
    }
    clearLocalCanvas();
}

function setWhiteboardColor(color) {
    STATE.whiteboard.color = color;
    STATE.whiteboard.mode = 'brush';
}

function setWhiteboardBrushSize(size) {
    STATE.whiteboard.brushSize = Number(size);
}

function setWhiteboardEraser() {
    STATE.whiteboard.mode = 'eraser';
}

function exportWhiteboardImage() {
    const canvas = STATE.whiteboard.canvas;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `whiteboard_no2ta_${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
}

// ----------------------------------------------------
// 9b. Shared Live CodePad / Plain Text Bin & Code Sharing 💻
// ----------------------------------------------------
async function openCodepadModal() {
    showModal('codepadModal');
    const textarea = document.getElementById('sharedCodePadTextarea');
    if (textarea) {
        if (!textarea.value && STATE.codepad.text) {
            textarea.value = STATE.codepad.text;
        } else if (!textarea.value) {
            try {
                const res = await fetch('/api/codepad');
                const data = await res.json();
                if (data.text !== undefined) {
                    STATE.codepad.text = data.text;
                    textarea.value = data.text;
                }
            } catch (e) {}
        }
        updateCodePadStats();
        setTimeout(() => textarea.focus(), 150);
    }
    if (STATE.socket) {
        STATE.socket.emit('codepad_request_sync');
    }
}

function updateCodePadStats() {
    const textarea = document.getElementById('sharedCodePadTextarea');
    const statsEl = document.getElementById('codepadStats');
    if (!textarea || !statsEl) return;
    const val = textarea.value;
    const lines = val ? val.split('\n').length : 0;
    const chars = val.length;
    statsEl.textContent = `${lines} سطر • ${chars} حرف`;
}

function handleCodePadInput() {
    updateCodePadStats();
    const textarea = document.getElementById('sharedCodePadTextarea');
    if (!textarea) return;

    STATE.codepad.text = textarea.value;

    const ind = document.getElementById('codepadSyncIndicator');
    if (ind) {
        ind.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span><span>جاري المزامنة...</span>';
    }

    clearTimeout(STATE.codepad.debounceTimer);
    STATE.codepad.debounceTimer = setTimeout(() => {
        if (STATE.socket) {
            STATE.socket.emit('codepad_update', {
                text: STATE.codepad.text,
                senderName: STATE.user ? STATE.user.nickname : 'زميل'
            });
        }
        if (ind) {
            ind.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span>متصل ومتزامن</span>';
        }
    }, 350);
}

function copyAllCodePadText() {
    const textarea = document.getElementById('sharedCodePadTextarea');
    const btn = document.getElementById('copyAllCodepadBtn');
    if (!textarea || !textarea.value.trim()) {
        showNotification('الكشكول فاضي! الصق فيه كود الأول.');
        return;
    }
    copyTextToClipboard(textarea.value, btn);
}

function clearCodePadText() {
    if (!confirm('هل أنت متأكد من مسح محتوى كشكول الأكواد المشترك بالكامل؟')) return;
    const textarea = document.getElementById('sharedCodePadTextarea');
    if (textarea) {
        textarea.value = '';
        STATE.codepad.text = '';
        updateCodePadStats();
        if (STATE.socket) {
            STATE.socket.emit('codepad_update', { text: '', senderName: STATE.user ? STATE.user.nickname : 'زميل' });
        }
        showNotification('تم تفريغ كشكول الأكواد المشترك 🗑️');
    }
}

function shareCodePadToChat() {
    const textarea = document.getElementById('sharedCodePadTextarea');
    if (!textarea || !textarea.value.trim()) {
        alert('الكشكول فاضي! اكتب كود أو نص الأول لمشاركته في الشات.');
        return;
    }
    const code = textarea.value.trim();
    sendChatMessagePayload({
        content: code,
        mediaType: 'code',
        mediaName: 'كشكول الأكواد (CodePad)'
    });
    hideModal('codepadModal');
    showNotification('تمت مشاركة محتوى الكشكول في الشات بنجاح! 🚀');
}

function openCodeSnippetModal() {
    showModal('codeSnippetModal');
    const codeInput = document.getElementById('snippetCodeInput');
    if (codeInput) {
        setTimeout(() => codeInput.focus(), 150);
    }
}

function handleCodeSnippetSubmit(e) {
    if (e) e.preventDefault();
    const codeInput = document.getElementById('snippetCodeInput');
    const titleInput = document.getElementById('snippetTitleInput');
    const langSelect = document.getElementById('snippetLanguageSelect');

    const code = codeInput ? codeInput.value.trim() : '';
    if (!code) {
        alert('الرجاء كتابة أو لصق الكود أولاً!');
        return;
    }

    const title = titleInput ? titleInput.value.trim() : '';
    const lang = langSelect ? langSelect.value : 'Plain Text';
    const mediaName = title ? `${title} (${lang})` : lang;

    sendChatMessagePayload({
        content: code,
        mediaType: 'code',
        mediaName: mediaName
    });

    if (codeInput) codeInput.value = '';
    if (titleInput) titleInput.value = '';
    hideModal('codeSnippetModal');
    showNotification('تمت مشاركة الكود في الشات بنجاح! 🚀');
}

function copySnippetCode(messageId, btnElement) {
    const codeEl = document.getElementById(`code-content-${messageId}`);
    if (codeEl) {
        const text = codeEl.innerText || codeEl.textContent;
        copyTextToClipboard(text, btnElement);
        return;
    }
    const msg = STATE.messages.find(m => m.id === messageId);
    if (msg && msg.content) {
        copyTextToClipboard(msg.content, btnElement);
    }
}

async function copyTextToClipboard(text, btnElement) {
    let success = false;
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            success = true;
        } catch (e) {
            success = false;
        }
    }
    if (!success) {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.top = '0';
            textarea.style.left = '-9999px';
            textarea.setAttribute('readonly', '');
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            success = document.execCommand('copy');
            document.body.removeChild(textarea);
        } catch (err) {
            success = false;
        }
    }

    if (btnElement) {
        const origHTML = btnElement.innerHTML;
        btnElement.innerHTML = '<span>✅ تم النسخ!</span>';
        btnElement.classList.add('bg-emerald-500', 'text-slate-950');
        setTimeout(() => {
            btnElement.innerHTML = origHTML;
            btnElement.classList.remove('bg-emerald-500', 'text-slate-950');
        }, 2000);
    }
    showNotification('تم نسخ الكود للحافظة بنجاح! 📋');
    return success;
}

function handleTextareaTabKey(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        const value = this.value;
        this.value = value.substring(0, start) + '    ' + value.substring(end);
        this.selectionStart = this.selectionEnd = start + 4;
        this.dispatchEvent(new Event('input'));
    }
}

// ----------------------------------------------------
// 9c. Classroom Real-time Screen Sharing & Live Cinema 🖥️🍿 (WebRTC)
// ----------------------------------------------------

// Toggle Button in Header
function toggleScreenShare() {
    if (STATE.screenShare.isSharing) {
        stopScreenShare();
    } else if (STATE.screenShare.isViewing) {
        closeScreenShareView();
    } else if (STATE.screenShare.activeShareInfo) {
        // Someone else is sharing: join it!
        joinScreenShare();
    } else {
        // Start new screen share as presenter
        startScreenShare();
    }
}

async function startScreenShare() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('ميزة مشاركة الشاشة غير مدعومة في هذا المتصفح. يرجى استخدام متصفح حديث (Chrome / Edge / Firefox).');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: 'always',
                displaySurface: 'monitor',
                frameRate: { ideal: 30, max: 60 }
            },
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

        STATE.screenShare.localStream = stream;
        STATE.screenShare.isSharing = true;
        STATE.screenShare.isViewing = false;

        const videoEl = document.getElementById('screenShareVideo');
        if (videoEl) {
            videoEl.srcObject = stream;
            videoEl.muted = true; // Mute locally to prevent audio feedback loop!
            videoEl.play().catch(e => console.warn('Video play error:', e));
        }

        openScreenSharePanel({
            presenterName: STATE.user ? STATE.user.nickname : 'أنا',
            isPresenter: true
        });

        // Listen for native browser stop sharing bar click
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.onended = () => {
                stopScreenShare();
            };
        }

        // Notify server
        if (STATE.socket) {
            STATE.socket.emit('screen_share_start', {
                presenterId: STATE.user ? STATE.user.id : null,
                presenterName: STATE.user ? STATE.user.nickname : 'زميلك',
                hasAudio: stream.getAudioTracks().length > 0
            });
        }

        showNotification('تم بدء بث الشاشة بنجاح! 🖥️ زمايلك في الفصل يقدروا يشوفوا البث الآن.');
    } catch (err) {
        console.error('Error starting screen share:', err);
        if (err.name !== 'NotAllowedError') {
            alert('حدث خطأ أثناء محاولة مشاركة الشاشة. يرجى المحاولة مرة أخرى.');
        }
    }
}

function stopScreenShare() {
    if (STATE.screenShare.localStream) {
        STATE.screenShare.localStream.getTracks().forEach(track => {
            track.stop();
        });
        STATE.screenShare.localStream = null;
    }

    // Close all viewer peer connections
    STATE.screenShare.peerConnections.forEach(pc => pc.close());
    STATE.screenShare.peerConnections.clear();

    STATE.screenShare.isSharing = false;
    closeScreenSharePanel();

    if (STATE.socket) {
        STATE.socket.emit('screen_share_stop');
    }

    showNotification('تم إيقاف بث الشاشة ⏹️');
}

function joinScreenShare() {
    if (!STATE.screenShare.activeShareInfo) {
        showNotification('لا يوجد بث شاشة مباشر حالياً.');
        return;
    }

    STATE.screenShare.isViewing = true;
    STATE.screenShare.isSharing = false;

    // Dismiss join banner
    dismissScreenShareNotification();

    openScreenSharePanel({
        presenterName: STATE.screenShare.activeShareInfo.presenterName || 'زميلك',
        isPresenter: false
    });

    const loadingOverlay = document.getElementById('screenShareLoadingOverlay');
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');

    // Initialize or Reset Viewer RTCPeerConnection
    if (STATE.screenShare.viewerPeerConnection) {
        STATE.screenShare.viewerPeerConnection.close();
    }

    const pc = new RTCPeerConnection(STATE.screenShare.rtcConfig);
    STATE.screenShare.viewerPeerConnection = pc;

    pc.ontrack = (event) => {
        console.log('🎥 Received remote screen share track:', event.track.kind);
        const videoEl = document.getElementById('screenShareVideo');
        if (videoEl) {
            videoEl.srcObject = event.streams[0];
            videoEl.muted = false; // Audio on for viewers
            videoEl.play().catch(e => console.warn('Autoplay error:', e));
        }
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    };

    pc.onicecandidate = (event) => {
        if (event.candidate && STATE.screenShare.activeShareInfo && STATE.socket) {
            STATE.socket.emit('webrtc_ice_candidate', {
                targetSocketId: STATE.screenShare.activeShareInfo.presenterSocketId,
                candidate: event.candidate
            });
        }
    };

    // Request presenter to send an offer
    if (STATE.socket) {
        STATE.socket.emit('webrtc_viewer_join', {
            viewerName: STATE.user ? STATE.user.nickname : 'طالب'
        });
    }
}

function closeScreenShareView() {
    if (STATE.screenShare.viewerPeerConnection) {
        STATE.screenShare.viewerPeerConnection.close();
        STATE.screenShare.viewerPeerConnection = null;
    }
    STATE.screenShare.isViewing = false;
    closeScreenSharePanel();
    showNotification('تم الخروج من مشاهدة البث 🚪');
}

function handleScreenShareControlClick() {
    if (STATE.screenShare.isSharing) {
        stopScreenShare();
    } else {
        closeScreenShareView();
    }
}

function openScreenSharePanel({ presenterName, isPresenter }) {
    const panel = document.getElementById('screenShareTheaterPanel');
    const nameEl = document.getElementById('screenSharePresenterName');
    const controlBtnText = document.getElementById('screenShareControlBtnText');
    const statusPill = document.getElementById('screenShareStatusPill');

    if (panel) panel.classList.remove('hidden');
    if (nameEl) nameEl.textContent = isPresenter ? `${presenterName} (أنت)` : presenterName;
    if (controlBtnText) controlBtnText.textContent = isPresenter ? 'إيقاف البث' : 'خروج من المشاهدة';
    if (statusPill) {
        statusPill.textContent = isPresenter ? 'أنت تبث الآن' : 'بث حي مباشر';
    }

    updateScreenShareHeaderButton();
}

function closeScreenSharePanel() {
    const panel = document.getElementById('screenShareTheaterPanel');
    const videoEl = document.getElementById('screenShareVideo');
    if (panel) panel.classList.add('hidden');
    if (videoEl) {
        videoEl.pause();
        videoEl.srcObject = null;
    }
    updateScreenShareHeaderButton();
}

function updateScreenShareHeaderButton() {
    const btn = document.getElementById('screenShareToggleBtn');
    const label = document.getElementById('screenShareBtnLabel');
    const dot = document.getElementById('screenShareLiveDot');
    if (!btn || !label || !dot) return;

    if (STATE.screenShare.isSharing) {
        label.textContent = 'إيقاف البث';
        btn.classList.add('bg-red-500/20', 'border-red-500/40', 'text-red-400');
        btn.classList.remove('bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-400');
        dot.classList.remove('hidden');
    } else if (STATE.screenShare.isViewing) {
        label.textContent = 'الخروج من البث';
        btn.classList.add('bg-cyan-500/20', 'border-cyan-500/40', 'text-cyan-400');
        btn.classList.remove('bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-400');
        dot.classList.remove('hidden');
    } else if (STATE.screenShare.activeShareInfo) {
        label.textContent = 'مشاهدة البث';
        btn.classList.add('bg-emerald-500/20', 'border-emerald-500/40', 'text-emerald-400');
        dot.classList.remove('hidden');
    } else {
        label.textContent = 'بث الشاشة';
        btn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all shadow-sm relative';
        dot.classList.add('hidden');
    }
}

// Fullscreen & PiP & Audio Helpers
function toggleScreenShareFullscreen() {
    const videoEl = document.getElementById('screenShareVideo');
    if (!videoEl) return;
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    } else {
        if (videoEl.requestFullscreen) {
            videoEl.requestFullscreen();
        } else if (videoEl.webkitRequestFullscreen) {
            videoEl.webkitRequestFullscreen();
        }
    }
}

async function toggleScreenSharePiP() {
    const videoEl = document.getElementById('screenShareVideo');
    if (!videoEl || !document.pictureInPictureEnabled) return;
    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else {
            await videoEl.requestPictureInPicture();
        }
    } catch (e) {
        console.warn('PiP error:', e);
    }
}

function toggleScreenShareAudio() {
    const videoEl = document.getElementById('screenShareVideo');
    const iconOn = document.getElementById('screenShareAudioIconOn');
    const iconOff = document.getElementById('screenShareAudioIconOff');
    if (!videoEl || !iconOn || !iconOff) return;
    videoEl.muted = !videoEl.muted;
    iconOn.classList.toggle('hidden', videoEl.muted);
    iconOff.classList.toggle('hidden', !videoEl.muted);
    showNotification(videoEl.muted ? 'تم كتم صوت البث' : 'تم تفعيل صوت البث');
}

function dismissScreenShareNotification() {
    const banner = document.getElementById('screenShareJoinNotification');
    if (banner) banner.classList.add('hidden');
}

// ----------------- WebRTC Event Handlers -----------------

function handleScreenShareStarted(shareInfo) {
    STATE.screenShare.activeShareInfo = shareInfo;
    updateScreenShareHeaderButton();

    // If I am NOT the presenter, show incoming notification banner
    const isMe = STATE.socket && STATE.socket.id === shareInfo.presenterSocketId;
    if (!isMe) {
        const banner = document.getElementById('screenShareJoinNotification');
        const textEl = document.getElementById('screenShareJoinText');
        if (banner && textEl) {
            textEl.textContent = `${shareInfo.presenterName} بدأ بث شاشته الآن! اضغط لمشاهدة البث مباشرة جنب الشات.`;
            banner.classList.remove('hidden');
        }
        showNotification(`🖥️ ${shareInfo.presenterName} بدأ بث شاشته الآن!`);
    }
}

function handleScreenShareEnded() {
    STATE.screenShare.activeShareInfo = null;
    dismissScreenShareNotification();

    if (STATE.screenShare.isViewing) {
        closeScreenShareView();
        showNotification('انتهى البث المباشر للشاشة ⏹️');
    } else if (STATE.screenShare.isSharing) {
        stopScreenShare();
    } else {
        updateScreenShareHeaderButton();
    }
}

// Presenter: Handle viewer join request -> send WebRTC offer
async function handleViewerJoined({ viewerSocketId, viewerName }) {
    if (!STATE.screenShare.isSharing || !STATE.screenShare.localStream) return;
    console.log(`📡 Presenter establishing WebRTC stream to viewer ${viewerName} (${viewerSocketId})`);

    const pc = new RTCPeerConnection(STATE.screenShare.rtcConfig);
    STATE.screenShare.peerConnections.set(viewerSocketId, pc);

    // Add local tracks to peer connection
    STATE.screenShare.localStream.getTracks().forEach(track => {
        pc.addTrack(track, STATE.screenShare.localStream);
    });

    pc.onicecandidate = (event) => {
        if (event.candidate && STATE.socket) {
            STATE.socket.emit('webrtc_ice_candidate', {
                targetSocketId: viewerSocketId,
                candidate: event.candidate
            });
        }
    };

    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (STATE.socket) {
            STATE.socket.emit('webrtc_offer', {
                targetSocketId: viewerSocketId,
                offer: pc.localDescription
            });
        }
    } catch (e) {
        console.error('Error creating offer for viewer:', e);
    }
}

// Viewer: Handle incoming offer from presenter -> send WebRTC answer
async function handleIncomingOffer({ presenterSocketId, offer }) {
    if (!STATE.screenShare.isViewing) return;
    const pc = STATE.screenShare.viewerPeerConnection;
    if (!pc) return;

    try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (STATE.socket) {
            STATE.socket.emit('webrtc_answer', {
                targetSocketId: presenterSocketId,
                answer: pc.localDescription
            });
        }
    } catch (e) {
        console.error('Error handling incoming offer:', e);
    }
}

// Presenter: Handle incoming answer from viewer
async function handleIncomingAnswer({ viewerSocketId, answer }) {
    const pc = STATE.screenShare.peerConnections.get(viewerSocketId);
    if (pc) {
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
            console.error('Error setting remote answer for viewer:', e);
        }
    }
}

// Both: Handle incoming ICE candidate
async function handleIncomingIceCandidate({ fromSocketId, candidate }) {
    try {
        if (STATE.screenShare.isSharing) {
            const pc = STATE.screenShare.peerConnections.get(fromSocketId);
            if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else if (STATE.screenShare.isViewing && STATE.screenShare.viewerPeerConnection) {
            await STATE.screenShare.viewerPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    } catch (e) {
        console.warn('Error adding ICE candidate:', e);
    }
}

// ----------------------------------------------------
// 9d. Synchronized Classroom Music Library & Online Jukebox 🎵⚡ (LAN + Online Stream)
// ----------------------------------------------------

let currentMusicTab = 'online';

function switchMusicModalTab(tab) {
    currentMusicTab = tab;
    const onlineBtn = document.getElementById('onlineMusicTabBtn');
    const localBtn = document.getElementById('localMusicTabBtn');
    const onlinePanel = document.getElementById('onlineMusicTabPanel');
    const localPanel = document.getElementById('localMusicTabPanel');

    if (tab === 'online') {
        if (onlineBtn) {
            onlineBtn.className = 'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-400 border border-pink-500/40 shadow-sm';
        }
        if (localBtn) {
            localBtn.className = 'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-white border border-transparent';
        }
        if (onlinePanel) onlinePanel.classList.remove('hidden');
        if (localPanel) localPanel.classList.add('hidden');
        setTimeout(() => {
            const inp = document.getElementById('onlineMusicSearchInput');
            if (inp) inp.focus();
        }, 100);
    } else {
        if (localBtn) {
            localBtn.className = 'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/40 shadow-sm';
        }
        if (onlineBtn) {
            onlineBtn.className = 'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-white border border-transparent';
        }
        if (localPanel) localPanel.classList.remove('hidden');
        if (onlinePanel) onlinePanel.classList.add('hidden');
        loadMusicLibrary();
        setTimeout(() => {
            const inp = document.getElementById('musicSearchInput');
            if (inp) inp.focus();
        }, 100);
    }
}


// ====================================================
// 📻 CAIRO HOLY QURAN RADIO BROADCAST SYSTEM
// ====================================================
// The live Quran stream now always arrives through our own server at
// /api/quran/live-relay (same-origin LAN request), which the server keeps alive and
// reconnects to the real radio source behind the scenes. The browser never talks to
// the blocked external radio domains directly anymore, so no client-side URL cycling
// is needed - just retry the one relay URL if playback hiccups.
let quranRelayRetryCount = 0;

let quranLibraryReciters = [];
let quranLibrarySurahs = [];

function openHolyQuranRadioModal() {
    showModal('holyQuranRadioModal');
    loadQuranLibraryPickers();
}

function openHolyQuranOfficialSite() {
    window.open('https://www.holyquranradio.com/', '_blank');
}

function toggleBroadcastQuranRadio() {
    openHolyQuranRadioModal();
}

async function loadQuranLibraryPickers() {
    const chipsEl = document.getElementById('quranReciterChips');
    const selectEl = document.getElementById('quranSurahSelect');
    if (!chipsEl || !selectEl) return;

    try {
        if (quranLibraryReciters.length === 0) {
            const r = await fetch('/api/quran/library/reciters').then(res => res.json());
            quranLibraryReciters = r.reciters || [];
        }
        if (quranLibrarySurahs.length === 0) {
            const s = await fetch('/api/quran/library/surahs').then(res => res.json());
            quranLibrarySurahs = s.surahs || [];
        }
    } catch (e) {
        console.warn('Failed to load Quran library lists:', e);
        return;
    }

    if (!chipsEl.dataset.populated) {
        chipsEl.innerHTML = quranLibraryReciters.map((r, i) => `
            <button type="button" onclick="selectQuranReciter('${r.id}')" data-reciter-chip="${r.id}"
                class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${i === 0 ? 'bg-amber-500/25 border-amber-400 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}">
                ${r.name}
            </button>
        `).join('');
        chipsEl.dataset.populated = '1';
        chipsEl.dataset.selected = quranLibraryReciters[0]?.id || '';
    }
    if (!selectEl.dataset.populated) {
        selectEl.innerHTML = quranLibrarySurahs.map(s => `<option value="${s.number}">${s.number}. ${s.name}</option>`).join('');
        selectEl.dataset.populated = '1';
        enhanceSelect('quranSurahSelect');
    } else {
        refreshSelectLabel('quranSurahSelect');
    }
}

function selectQuranReciter(reciterId) {
    const chipsEl = document.getElementById('quranReciterChips');
    if (!chipsEl) return;
    chipsEl.dataset.selected = reciterId;
    chipsEl.querySelectorAll('[data-reciter-chip]').forEach(btn => {
        const active = btn.dataset.reciterChip === reciterId;
        btn.className = `shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active ? 'bg-amber-500/25 border-amber-400 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`;
    });
}

function getSelectedQuranChoice() {
    const chipsEl = document.getElementById('quranReciterChips');
    const selectEl = document.getElementById('quranSurahSelect');
    const reciterId = chipsEl?.dataset.selected || quranLibraryReciters[0]?.id;
    const surahNumber = selectEl?.value || 1;
    return { reciterId, surahNumber };
}

async function broadcastQuranLibrarySelection() {
    const { reciterId, surahNumber } = getSelectedQuranChoice();
    if (!reciterId) return;
    try {
        const res = await fetch('/api/quran/library/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reciterId, surahNumber, userName: STATE.user ? STATE.user.nickname : 'المشرف' })
        }).then(r => r.json());
        if (res.success) {
            showNotification(`جاري بث ${res.track.title} لكل الفصل`);
            hideModal('holyQuranRadioModal');
        } else {
            showNotification('تعذر بدء البث');
        }
    } catch (e) {
        showNotification('تعذر الاتصال بالسيرفر');
    }
}

function stopQuranLibraryBroadcast() {
    fetch('/api/quran/library/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
    }).catch(() => {});
    showNotification('تم إيقاف البث لجميع الأجهزة');
}

// ---- Local-only playback: plays on THIS device only, completely separate from the
// classroom-wide synced radio bar. Uses its own <audio> element and small floating bar. ----
let localOnlyAudioEl = null;

function getLocalOnlyAudioElement() {
    if (!localOnlyAudioEl) {
        localOnlyAudioEl = new Audio();
        localOnlyAudioEl.addEventListener('ended', () => hideLocalOnlyBar());
    }
    return localOnlyAudioEl;
}

function playLocalOnlyAudio(url, title) {
    const audio = getLocalOnlyAudioElement();
    audio.src = url;
    audio.play().catch(e => console.warn('Local-only playback error:', e));
    showLocalOnlyBar(title);
}

function showLocalOnlyBar(title) {
    let bar = document.getElementById('localOnlyPlayerBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'localOnlyPlayerBar';
        bar.className = 'fixed bottom-4 start-4 z-[70] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl';
        document.body.appendChild(bar);
    }
    bar.innerHTML = `
        <i data-lucide="headphones" class="w-[15px] h-[15px] text-slate-300"></i>
        <span class="text-xs font-bold text-white max-w-[160px] truncate">${title}</span>
        <span class="text-micro text-slate-500">عندك بس</span>
        <button type="button" onclick="stopLocalOnlyAudio()" class="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center">
            <i data-lucide="x" class="w-3 h-3"></i>
        </button>
    `;
    bar.classList.remove('hidden');
    renderIcons();
}

function hideLocalOnlyBar() {
    const bar = document.getElementById('localOnlyPlayerBar');
    if (bar) bar.classList.add('hidden');
}

function stopLocalOnlyAudio() {
    if (localOnlyAudioEl) {
        localOnlyAudioEl.pause();
        localOnlyAudioEl.removeAttribute('src');
    }
    hideLocalOnlyBar();
}

function playQuranLibraryLocalOnly() {
    const { reciterId, surahNumber } = getSelectedQuranChoice();
    if (!reciterId) return;
    const surah = quranLibrarySurahs.find(s => String(s.number) === String(surahNumber));
    const reciter = quranLibraryReciters.find(r => r.id === reciterId);
    const url = `/api/quran/library/stream?reciter=${encodeURIComponent(reciterId)}&surah=${surahNumber}`;
    playLocalOnlyAudio(url, `سورة ${surah ? surah.name : ''} — ${reciter ? reciter.name : ''}`);
    hideModal('holyQuranRadioModal');
}

function handleRadioAudioError(e) {
    const audio = STATE.radio.audioEl;
    if (!audio || !STATE.radio.activeTrack) return;

    if (STATE.radio.activeTrack.id === 'quran_cairo_live') {
        quranRelayRetryCount++;
        if (quranRelayRetryCount <= 5) {
            // The server-side relay auto-reconnects to the real radio source on its own;
            // we just need to re-attach to our own LAN endpoint after a short pause.
            console.warn(`[Quran Radio] Relay hiccup, retrying (${quranRelayRetryCount}/5)...`);
            setTimeout(() => {
                if (STATE.radio.activeTrack && STATE.radio.activeTrack.id === 'quran_cairo_live' && STATE.radio.isPlaying) {
                    audio.src = '/api/quran/live-relay?t=' + Date.now();
                    audio.load();
                    audio.play().catch(err => console.warn('Relay retry play error:', err));
                }
            }, 1200);
        } else {
            console.warn('[Quran Radio] Relay still unreachable after several retries.');
            showNotification('⚠️ تعذر تشغيل الصوت المباشر تلقائياً؛ يمكنك فتح موقع holyquranradio.com مباشرة ↗');
            openHolyQuranRadioModal();
        }
    } else {
        // Generic one-shot retry for any other track (Quran surah, classroom music...) —
        // usually just a transient network hiccup.
        const failedSrc = audio.src;
        setTimeout(() => {
            if (STATE.radio.isPlaying && audio.src === failedSrc) {
                audio.load();
                audio.play().catch(err => console.warn('Audio retry play error:', err));
            }
        }, 1500);
    }
}

function openMusicModal() {
    showModal('musicSearchModal');
    switchMusicModalTab('online');
    loadMusicLibraryCountOnly();
}

async function loadMusicLibraryCountOnly() {
    try {
        const res = await fetch('/api/music/library');
        const data = await res.json();
        const count = data.tracks ? data.tracks.length : 0;
        const badge = document.getElementById('localTabCountBadge');
        if (badge) badge.textContent = count;
    } catch (e) {}
}

function quickSearchOnline(term) {
    const inp = document.getElementById('onlineMusicSearchInput');
    if (inp) {
        inp.value = term;
        searchOnlineMusic(term);
    }
}

let onlineSearchDebounce = null;
function handleOnlineMusicSearchInput(val) {
    if (onlineSearchDebounce) clearTimeout(onlineSearchDebounce);
    if (!val || !val.trim()) return;
    onlineSearchDebounce = setTimeout(() => {
        searchOnlineMusic(val);
    }, 600);
}

async function searchOnlineMusic(query) {
    const q = (query || '').trim();
    const container = document.getElementById('onlineMusicResultsContainer');
    if (!container) return;

    if (!q) {
        container.innerHTML = `
            <div class="text-center py-10 text-slate-500">
                <span class="text-4xl block mb-2">🌐</span>
                <p class="text-xs font-bold text-slate-400">ابحث عن أي أغنية أونلاين لتشغيلها لجميع الطلاب فوراً!</p>
                <p class="text-micro text-slate-500 mt-1">يتم سحب الأغنية وتوزيعها تلقائياً عبر شبكة المعمل بدون حجب ⚡</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="text-center py-12 text-pink-400">
            <span class="text-4xl block mb-3 animate-spin">🌀</span>
            <p class="text-xs font-bold text-white">جاري البحث عن "${escapeHtml(q)}" في قاعدة الموسيقى العالمية...</p>
            <p class="text-micro text-slate-400 mt-1">تخطي حجب الفايروول شغال 🛡️⚡</p>
        </div>
    `;

    try {
        const res = await fetch(`/api/music/online/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        const songs = data.songs || [];
        window._lastOnlineSongs = songs;

        renderOnlineMusicResults(songs, q);
    } catch (err) {
        container.innerHTML = `
            <div class="text-center py-8 text-red-400 text-xs">
                <span class="text-3xl block mb-2">⚠️</span>
                <p class="font-bold">تعذر البحث عن الأغاني أونلاين!</p>
                <p class="text-micro text-slate-400 mt-1">${escapeHtml(err.message)}</p>
            </div>
        `;
    }
}

function renderOnlineMusicResults(songs, query) {
    const container = document.getElementById('onlineMusicResultsContainer');
    if (!container) return;

    if (songs.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 text-slate-500">
                <span class="text-3xl block mb-2">🔍</span>
                <p class="text-xs font-bold text-slate-400">لم يتم العثور على نتائج لـ "${escapeHtml(query)}"</p>
                <p class="text-micro text-slate-500 mt-1">جرب كتابة اسم الأغنية أو الفنان بشكل مختلف (عربي أو إنجليزي)</p>
            </div>
        `;
        return;
    }

    let html = '';
    songs.forEach((song, idx) => {
        const isCurrentPlaying = STATE.radio.activeTrack && 
            (STATE.radio.activeTrack.id === 'track_online_' + song.id || STATE.radio.activeTrack.title === song.title) && 
            STATE.radio.isPlaying;

        html += `
            <div class="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/80 border ${isCurrentPlaying ? 'border-pink-500/60 bg-pink-500/10' : 'border-slate-800'} hover:border-pink-500/40 transition-all group">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 overflow-hidden shrink-0 shadow-md flex items-center justify-center text-xl text-pink-400 relative">
                        ${song.cover ? `<img src="${song.cover}" loading="lazy" class="w-full h-full object-cover" onerror="this.outerHTML='🎵'">` : '🎵'}
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                            <h4 class="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-xs group-hover:text-pink-300 transition-colors">${escapeHtml(song.title)}</h4>
                            ${isCurrentPlaying ? '<span class="text-micro px-1.5 py-0.2 rounded-full bg-pink-500/30 text-pink-300 font-bold animate-pulse">شغالة الآن</span>' : ''}
                        </div>
                        <p class="text-micro text-slate-400 truncate mt-0.5">
                            ${escapeHtml(song.artist || 'فنان')} 
                            ${song.album ? `• ${escapeHtml(song.album)}` : ''}
                            ${song.duration ? `• ${song.duration}` : ''}
                        </p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <!-- Share to Chat -->
                    <button type="button" onclick="shareOnlineTrackToChat(${idx})" class="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all" title="مشاركة في الشات 💬">
                        💬
                    </button>
                    <!-- Play for Class -->
                    <button type="button" id="onlinePlayBtn_${idx}" onclick="playOnlineSongForEveryone(${idx})" class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1">
                        <span>${isCurrentPlaying ? 'إعادة تشغيل 🔄' : 'تشغيل للكل 🎵'}</span>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function playOnlineSongForEveryone(idx) {
    const song = window._lastOnlineSongs?.[idx];
    if (!song) return;

    // Immediately prime and unblock local audio element inside user click gesture!
    const audio = getRadioAudioElement();
    if (audio) {
        audio.muted = false;
        audio.volume = 1.0;
    }

    const btn = document.getElementById(`onlinePlayBtn_${idx}`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span>جاري التشغيل... 🎵</span>`;
    }

    showNotification(`جاري تشغيل "${song.title}" لجميع أجهزة المعمل...`);

    try {
        const res = await fetch('/api/music/online/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                songId: song.id,
                title: song.title,
                artist: song.artist,
                rawCover: song.rawCover,
                streamUrl: song.streamUrl,
                duration: song.duration,
                djName: STATE.user ? STATE.user.nickname : 'دي جي الفصل',
                djId: STATE.user ? STATE.user.id : null
            })
        });

        const data = await res.json();
        if (data.success && data.track) {
            hideModal('musicSearchModal');
            showNotification(`🎶 تم تشغيل "${song.title}" لجميع أجهزة المعمل!`);
            loadMusicLibraryCountOnly();
            // Start local playback immediately with direct source
            if (audio && (data.track.audioUrl || data.track.file_url)) {
                audio.src = data.track.audioUrl || data.track.file_url;
                audio.play().catch(e => console.warn('Instant play catch:', e));
            }
        } else {
            showNotification(data.error || 'تعذر تشغيل الأغنية.');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span>تشغيل للكل 🎵</span>`;
            }
        }
    } catch (err) {
        showNotification('حدث خطأ أثناء تشغيل الأغنية أونلاين: ' + err.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span>تشغيل للكل 🎵</span>`;
        }
    }
}

function shareOnlineTrackToChat(idx) {
    const song = window._lastOnlineSongs?.[idx];
    if (!song) return;

    sendChatMessagePayload({
        content: `🎵 أرشح لكم الاستماع إلى: **${song.title}** - *${song.artist}* 🎧`,
        mediaType: 'text',
        mediaName: song.title
    });
    hideModal('musicSearchModal');
    showNotification('تمت مشاركة الأغنية في الشات 💬');
}

let musicSearchDebounce = null;
function handleMusicSearchInput(val) {
    if (musicSearchDebounce) clearTimeout(musicSearchDebounce);
    musicSearchDebounce = setTimeout(() => {
        loadMusicLibrary(val);
    }, 250);
}

async function loadMusicLibrary(query = '') {
    const container = document.getElementById('musicResultsContainer');
    const countEl = document.getElementById('musicLibraryCountText');
    if (!container) return;

    try {
        const res = await fetch(`/api/music/library?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const tracks = data.tracks || [];
        window._lastSearchedTracks = tracks;

        if (countEl) {
            countEl.textContent = `${tracks.length} أغنية متوفرة في الفصل 🎵`;
        }
        const badge = document.getElementById('localTabCountBadge');
        if (badge) badge.textContent = tracks.length;

        renderMusicResults(tracks, query);
    } catch (err) {
        container.innerHTML = `
            <div class="text-center py-8 text-red-400 text-xs">
                <span class="text-3xl block mb-2">⚠️</span>
                <p class="font-bold">تعذر تحميل مكتبة موسيقى الفصل!</p>
            </div>
        `;
    }
}

function renderMusicResults(tracks, query) {
    const container = document.getElementById('musicResultsContainer');
    if (!container) return;

    if (tracks.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 text-slate-500">
                <span class="text-3xl block mb-2">🔍</span>
                <p class="text-xs font-bold text-slate-400">
                    ${query ? `لم يتم العثور على أغاني مطابقة لـ "${escapeHtml(query)}"` : 'لا توجد أغاني في مكتبة الفصل حالياً!'}
                </p>
                <p class="text-micro text-slate-500 mt-1">اضغط على زر "➕ رفع أغنية" فوق لرفع أي أغنية عندك على الجهاز!</p>
            </div>
        `;
        return;
    }

    let html = '';
    tracks.forEach((track, idx) => {
        const isCurrentPlaying = STATE.radio.activeTrack && STATE.radio.activeTrack.id === track.id && STATE.radio.isPlaying;
        const canDelete = STATE.user && (track.uploader_id === STATE.user.id || STATE.user.role === 'admin');

        html += `
            <div class="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/70 border ${isCurrentPlaying ? 'border-pink-500/60 bg-pink-500/10' : 'border-slate-800'} hover:border-pink-500/40 transition-all group">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-11 h-11 rounded-xl bg-slate-800 border border-white/10 overflow-hidden shrink-0 shadow-md flex items-center justify-center text-xl text-pink-400">
                        ${track.cover ? `<img src="${track.cover}" class="w-full h-full object-cover" onerror="this.outerHTML='🎵'">` : (isCurrentPlaying ? '💿' : '🎵')}
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                            <h4 class="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-xs group-hover:text-pink-300 transition-colors">${escapeHtml(track.title)}</h4>
                            ${isCurrentPlaying ? '<span class="text-micro px-1.5 py-0.2 rounded-full bg-pink-500/30 text-pink-300 font-bold animate-pulse">شغالة الآن</span>' : ''}
                        </div>
                        <p class="text-micro text-slate-400 truncate">
                            ${escapeHtml(track.artist || 'فنان')} 
                            ${track.uploader_name ? `• رافعها: ${escapeHtml(track.uploader_name)}` : ''}
                            ${track.duration ? '• ' + track.duration : ''}
                        </p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <!-- Share to Chat -->
                    <button onclick="shareTrackToChatByIndex(${idx})" class="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all" title="مشاركة في الشات 💬">
                        💬
                    </button>
                    <!-- Delete Track (if allowed) -->
                    ${canDelete ? `
                        <button onclick="deleteLibraryMusic('${track.id}')" class="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs font-bold transition-all" title="حذف الأغنية من المكتبة">
                            🗑️
                        </button>
                    ` : ''}
                    <!-- Play for Class -->
                    <button onclick="playTrackForEveryoneByIndex(${idx})" class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1">
                        <span>${isCurrentPlaying ? 'إعادة تشغيل 🔄' : 'تشغيل للكل 🎵'}</span>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function playTrackForEveryoneByIndex(idx) {
    const track = window._lastSearchedTracks?.[idx];
    if (!track) return;

    if (STATE.socket) {
        STATE.socket.emit('radio_play', {
            track: {
                id: track.id,
                title: track.title,
                artist: track.artist,
                cover: track.cover || '',
                audioUrl: track.file_url,
                file_url: track.file_url,
                duration: track.duration || ''
            },
            currentTime: 0,
            djName: STATE.user ? STATE.user.nickname : 'دي جي الفصل',
            djId: STATE.user ? STATE.user.id : null
        });
    }
    hideModal('musicSearchModal');
    showNotification(`🎶 تم تشغيل "${track.title}" لجميع الطلاب في الفصل!`);
}

function shareTrackToChatByIndex(idx) {
    const track = window._lastSearchedTracks?.[idx];
    if (!track) return;

    sendChatMessagePayload({
        content: `🎵 أستمع الآن إلى: **${track.title}** - *${track.artist}* 🎧`,
        mediaType: 'text',
        mediaName: track.title
    });
    hideModal('musicSearchModal');
    showNotification('تمت مشاركة الأغنية في الشات 💬');
}

async function handleRadioFileUpload(file) {
    if (!file || !STATE.user) {
        showNotification('الرجاء اختيار ملف صوتي صالح!');
        return;
    }
    showNotification(`جاري رفع "${file.name}" لمكتبة الفصل وتشغيلها...`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
    formData.append('artist', STATE.user.nickname);
    formData.append('uploaderId', STATE.user.id);
    formData.append('uploaderName', STATE.user.nickname);

    try {
        const res = await fetch('/api/music/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success && data.track) {
            const track = data.track;
            if (STATE.socket) {
                STATE.socket.emit('radio_play', {
                    track: {
                        id: track.id,
                        title: track.title,
                        artist: track.artist,
                        cover: '',
                        audioUrl: track.file_url,
                        file_url: track.file_url,
                        duration: track.duration || ''
                    },
                    currentTime: 0,
                    djName: STATE.user.nickname,
                    djId: STATE.user.id
                });
            }
            hideModal('musicSearchModal');
            showNotification(`تم رفع وتشغيل "${track.title}" لجميع أجهزة المعمل! 🎵⚡`);
            loadMusicLibrary();
        } else {
            showNotification(data.error || 'فشل رفع الملف الصوتي.');
        }
    } catch (e) {
        showNotification('حدث خطأ أثناء رفع الملف الصوتي.');
    }
}

async function deleteLibraryMusic(trackId) {
    if (!STATE.user) return;
    if (!confirm('هل تريد حذف هذه الأغنية نهائياً من مكتبة الفصل؟')) return;

    try {
        const res = await fetch(`/api/music/${trackId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: STATE.user.id })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('تم حذف الأغنية من المكتبة.');
            loadMusicLibrary();
        } else {
            showNotification(data.error || 'تعذر حذف الأغنية!');
        }
    } catch (err) {
        showNotification('حدث خطأ أثناء حذف الأغنية.');
    }
}

function handleRadioSyncState(state) {
    const bar = document.getElementById('classroomMusicBar');
    const audio = getRadioAudioElement();
    const titleEl = document.getElementById('radioTrackTitle');
    const artistEl = document.getElementById('radioTrackArtist');
    const coverWrapper = document.getElementById('radioCoverWrapper');
    const playIcon = document.getElementById('radioPlayIcon');

    if (!state || !state.track) {
        STATE.radio.activeTrack = null;
        STATE.radio.isPlaying = false;
        if (audio) {
            audio.pause();
            audio.removeAttribute('src');
        }
        if (bar) bar.classList.add('hidden');
        hideAutoplayUnlockBanner();
        return;
    }

    STATE.radio.activeTrack = state.track;
    STATE.radio.isPlaying = !!state.isPlaying;

    if (bar) bar.classList.remove('hidden');

    // Update Quran button/badges and the library modal's "now playing" banner
    const trackId = String((state && state.track && state.track.id) || '');
    const isQuranPlaying = !!(state && state.isPlaying && (trackId === 'quran_cairo_live' || trackId.startsWith('quran_surah_')));
    const quranBtn = document.getElementById('quranRadioBroadcastBtn');
    const quranLiveDot = document.getElementById('quranRadioLiveIndicator');
    const quranBtnText = document.getElementById('quranRadioBtnText');
    const adminQuranBtnText = document.getElementById('adminQuranRadioBtnText');
    const modalQuranBtnText = document.getElementById('modalQuranRadioBtnText');

    if (quranBtn) {
        if (isQuranPlaying) {
            quranBtn.className = 'flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl bg-amber-500/30 border border-amber-400 text-amber-300 text-xs font-bold transition-all shadow-md shadow-amber-500/20 shrink-0 animate-pulse';
            if (quranLiveDot) quranLiveDot.classList.remove('hidden');
            if (quranBtnText) quranBtnText.textContent = 'القرآن شغّال';
        } else {
            quranBtn.className = 'flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all shadow-sm relative shrink-0';
            if (quranLiveDot) quranLiveDot.classList.add('hidden');
            if (quranBtnText) quranBtnText.textContent = 'إذاعة القرآن';
        }
    }
    if (adminQuranBtnText) {
        adminQuranBtnText.textContent = isQuranPlaying ? 'إيقاف إذاعة القرآن للجميع' : 'إذاعة القرآن (لكل الأجهزة)';
    }
    if (modalQuranBtnText) {
        modalQuranBtnText.textContent = isQuranPlaying ? 'إيقاف البث' : 'فتح المكتبة';
    }

    const quranNowPlaying = document.getElementById('quranLibraryNowPlaying');
    const quranNowPlayingText = document.getElementById('quranLibraryNowPlayingText');
    if (quranNowPlaying && quranNowPlayingText) {
        if (trackId.startsWith('quran_surah_') && state.isPlaying) {
            quranNowPlaying.classList.remove('hidden');
            quranNowPlayingText.textContent = `شغال دلوقتي: ${state.track.title} — ${state.track.artist}`;
        } else {
            quranNowPlaying.classList.add('hidden');
        }
    }

    if (trackId === 'quran_cairo_live') {
        quranRelayRetryCount = 0; // Reset retry counter on fresh play
    }

    if (titleEl) titleEl.textContent = state.track.title || 'أغنية الفصل';
    if (artistEl) artistEl.textContent = `${state.track.artist || 'موسيقى'} • مشغل بواسطة: ${state.djName || 'دي جي الفصل 🎧'}`;
    if (playIcon) playIcon.textContent = state.isPlaying ? '⏸' : '▶';

    if (coverWrapper) {
        if (state.track.cover) {
            coverWrapper.innerHTML = `<img src="${state.track.cover}" class="w-full h-full object-cover" onerror="this.outerHTML='<span class=\\'animate-spin\\'>📻</span>'">`;
        } else {
            coverWrapper.innerHTML = `<span class="animate-spin" style="animation-duration: 4s;">📻</span>`;
        }
    }

    if (audio) {
        audio.muted = false;
        let targetSrc = state.track.file_url || state.track.audioUrl;
        if (targetSrc && audio.src !== targetSrc && !audio.src.endsWith(targetSrc)) {
            audio.src = targetSrc;
            audio.load();
        } else if (!targetSrc) {
            audio.pause();
            audio.removeAttribute('src');
        }

        if (!state.track.isLive && state.track.id !== 'quran_cairo_live') {
            const expectedTime = state.currentTime || 0;
            if (Math.abs(audio.currentTime - expectedTime) > 2) {
                audio.currentTime = expectedTime;
            }
        }

        if (state.isPlaying && !STATE.isStealthActive && targetSrc) {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    hideAutoplayUnlockBanner();
                }).catch(e => {
                    console.warn('Radio autoplay error (user gesture needed):', e);
                    showAutoplayUnlockBanner(state.track.title);
                });
            }
        } else {
            audio.pause();
            hideAutoplayUnlockBanner();
        }
    }
}

function showAutoplayUnlockBanner(title) {
    const banner = document.getElementById('musicAutoplayUnlockBanner');
    const titleEl = document.getElementById('musicAutoplayTrackTitle');
    if (banner) {
        if (titleEl && title) titleEl.textContent = `راديو الفصل: "${title}" • اضغط هنا للاستماع`;
        banner.classList.remove('hidden');
    }
}

function hideAutoplayUnlockBanner() {
    const banner = document.getElementById('musicAutoplayUnlockBanner');
    if (banner) banner.classList.add('hidden');
}

function unlockAudioAutoplay() {
    hideAutoplayUnlockBanner();
    const audio = getRadioAudioElement();
    if (audio) {
        audio.muted = false;
        audio.volume = 1.0;
        audio.play().catch(e => console.error('Unlock audio play error:', e));
    }
}

function getRadioAudioElement() {
    if (!STATE.radio.audioEl) {
        STATE.radio.audioEl = document.getElementById('classroomAudioElement');
        if (STATE.radio.audioEl) {
            STATE.radio.audioEl.addEventListener('timeupdate', updateRadioProgressUI);
            STATE.radio.audioEl.addEventListener('error', handleRadioAudioError);
            STATE.radio.audioEl.addEventListener('ended', () => {
                if (STATE.radio.activeTrack && (STATE.radio.activeTrack.id === 'quran_cairo_live' || STATE.radio.activeTrack.isLive)) {
                    console.log('[Quran Radio] Live stream ended/reconnecting...');
                    setTimeout(() => {
                        if (STATE.radio.isPlaying && STATE.radio.activeTrack && STATE.radio.activeTrack.id === 'quran_cairo_live') {
                            STATE.radio.audioEl.src = '/api/quran/live-relay?t=' + Date.now();
                            STATE.radio.audioEl.load();
                            STATE.radio.audioEl.play().catch(e => console.warn('Quran radio reconnect error:', e));
                        }
                    }, 1000);
                } else if (STATE.radio.activeTrack && String(STATE.radio.activeTrack.id || '').startsWith('quran_surah_')) {
                    // Continuous Quran playback: tell the server to advance everyone to the next surah.
                    if (STATE.socket) STATE.socket.emit('quran_track_ended');
                } else if (STATE.socket && STATE.radio.activeTrack) {
                    STATE.socket.emit('radio_stop');
                }
            });
        }
    }
    return STATE.radio.audioEl;
}

function updateRadioProgressUI() {
    if (STATE.radio.isSeeking) return;
    const progressBar = document.getElementById('radioProgressBar');
    const curTimeEl = document.getElementById('radioCurrentTime');
    const totTimeEl = document.getElementById('radioTotalDuration');
    const audio = STATE.radio.audioEl;
    if (!audio) return;

    // 🔴 Live stream handling (Cairo Quran Radio)
    if (STATE.radio.activeTrack && (STATE.radio.activeTrack.isLive || STATE.radio.activeTrack.id === 'quran_cairo_live' || !isFinite(audio.duration))) {
        if (progressBar) progressBar.value = 100;
        if (totTimeEl) totTimeEl.innerHTML = '<span class="text-emerald-400 font-bold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> مباشر</span>';
        if (curTimeEl) curTimeEl.textContent = 'بث حي';
        return;
    }

    if (audio.duration && !isNaN(audio.duration)) {
        if (progressBar) progressBar.value = (audio.currentTime / audio.duration) * 100;
        if (totTimeEl) totTimeEl.textContent = formatAudioSeconds(audio.duration);
    }
    if (curTimeEl) curTimeEl.textContent = formatAudioSeconds(audio.currentTime);
}

// Keep progress bar updated smoothly
setInterval(updateRadioProgressUI, 500);

function handleRadioProgressInput(percent) {
    const audio = STATE.radio.audioEl;
    if (!audio || !audio.duration) return;
    const newTime = (percent / 100) * audio.duration;
    audio.currentTime = newTime;

    if (STATE.socket) {
        STATE.socket.emit('radio_seek', { currentTime: newTime });
    }
}

function toggleRadioPlayPause() {
    if (!STATE.radio.activeTrack) return;
    const isPlaying = STATE.radio.isPlaying;
    const audio = getRadioAudioElement();
    const curTime = audio ? (audio.currentTime || 0) : 0;

    if (isPlaying) {
        if (STATE.socket) {
            STATE.socket.emit('radio_pause', { currentTime: curTime });
        }
    } else {
        if (STATE.socket) {
            STATE.socket.emit('radio_play', {
                track: STATE.radio.activeTrack,
                currentTime: curTime,
                djName: STATE.user ? STATE.user.nickname : 'أنت'
            });
        }
    }
}

function closeRadioBar() {
    if (confirm('هل تريد إيقاف الأغنية للجميع في الفصل؟')) {
        if (STATE.socket) {
            STATE.socket.emit('radio_stop');
        }
    } else {
        const bar = document.getElementById('classroomMusicBar');
        if (bar) bar.classList.add('hidden');
    }
}

function formatAudioSeconds(sec) {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ----------------------------------------------------
// 10. Admin Superpowers Dashboard
// ----------------------------------------------------
async function openAdminDashboard() {
    // Strictly ONLY the hardware admin (MAC D0:8E:79:18:9F:A0) can open this!
    if (!STATE.networkInfo || !STATE.networkInfo.isHostAdmin) {
        return; // Silent abort for any other student
    }

    try {
        const res = await fetch('/api/admin/devices');
        if (!res.ok) return;
        const data = await res.json();
        renderAdminDashboard(data);
        showModal('adminModal');
    } catch (e) {
        alert('فشل تحميل لوحة الأدمن!');
    }
}

function renderAdminDashboard(data) {
    const container = document.getElementById('adminDevicesTable');
    if (!container) return;

    container.innerHTML = data.devices.map(d => `
        <tr class="border-b border-slate-800 text-xs">
            <td class="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                <span class="w-6 h-6 rounded-full overflow-hidden inline-flex items-center justify-center text-sm shrink-0">${renderAvatarHTML(d.avatar)}</span>
                <span>${escapeHtml(d.nickname)}</span>
            </td>
            <td class="py-2.5 px-3 text-cyan-400 font-mono">${d.ip}</td>
            <td class="py-2.5 px-3 text-slate-400 font-mono text-[11px]">${d.mac}</td>
            <td class="py-2.5 px-3">
                <span class="px-2 py-0.5 rounded-full text-micro font-bold ${d.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'}">
                    ${d.role}
                </span>
            </td>
            <td class="py-2.5 px-3">
                ${d.role !== 'admin' ? `
                    <button onclick="adminKickUser('${d.userId}')" class="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white transition-all text-[11px] font-bold">
                        طرد ⛔
                    </button>
                ` : '<span class="text-slate-600 text-micro">-</span>'}
            </td>
        </tr>
    `).join('');

    const focusBtn = document.getElementById('adminToggleFocusBtn');
    if (focusBtn) {
        focusBtn.textContent = data.isChatFocusLocked ? '🔓 إلغاء قفل الشات (وضع الشرح)' : '🔒 تفعيل وضع التركيز (قفل الشات)';
        focusBtn.className = data.isChatFocusLocked 
            ? 'w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500 text-slate-950 transition-all'
            : 'w-full py-2.5 rounded-xl font-bold text-xs bg-amber-500 text-slate-950 transition-all';
    }
}

async function adminBroadcastAlert() {
    const msg = prompt('📢 اكتب نص الإذاعة العامة لجميع أجهزة الفصل:');
    if (!msg) return;

    await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'broadcast_alert',
            payload: { message: msg }
        })
    });
}

async function adminStealthRelease() {
    await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'stealth_release',
            payload: {}
        })
    });
    alert('تم إرسال أمر فك التمويه لجميع الشاشات بنجاح! 🚀');
}

async function adminToggleFocusMode() {
    const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'toggle_focus_mode',
            payload: {}
        })
    });
    const data = await res.json();
    const focusBtn = document.getElementById('adminToggleFocusBtn');
    if (focusBtn) {
        focusBtn.textContent = data.isChatFocusLocked ? '🔓 إلغاء قفل الشات (وضع الشرح)' : '🔒 تفعيل وضع التركيز (قفل الشات)';
    }
}

async function adminKickUser(userId) {
    if (!confirm('هل أنت متأكد من طرد هذا الطالب من الفصل؟')) return;
    await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'kick_user',
            payload: { userId }
        })
    });
    openAdminDashboard(); // Refresh
}

async function adminDeleteMessage(messageId) {
    if (!confirm('حذف هذه الرسالة من عند الجميع؟')) return;
    await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'delete_message',
            payload: { messageId }
        })
    });
}

// ----------------------------------------------------
// 11. Modal & Notification Utilities
// ----------------------------------------------------
function showModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('hidden');
    renderIcons();
    if (id === 'profileModal' && STATE.user) {
        const nick = document.getElementById('editNickname');
        const bio = document.getElementById('editBio');
        if (nick) nick.value = STATE.user.nickname || '';
        if (bio) bio.value = STATE.user.bio || '';
        const radio = document.querySelector(`input[name="editAvatar"][value="${STATE.user.avatar}"]`);
        if (radio) {
            radio.checked = true;
        } else {
            document.querySelectorAll('input[name="editAvatar"]').forEach(r => r.checked = false);
        }
        const previewEl = document.getElementById('editAvatarCustomPreview');
        if (previewEl) previewEl.innerHTML = renderAvatarHTML(STATE.user.avatar);
        STATE.pendingEditAvatarUrl = null;
    }
    if (id === 'storyCreatorModal') {
        removeStorySelectedFile();
    }
    if (id === 'whiteboardModal') {
        setTimeout(resizeWhiteboardCanvas, 50);
        setTimeout(resizeWhiteboardCanvas, 200);
    }
}

function hideModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('hidden');
    if (id === 'netSupportModal' && STATE.netSupport && STATE.netSupport.pollInterval) {
        clearInterval(STATE.netSupport.pollInterval);
        STATE.netSupport.pollInterval = null;
    }
    if (id === 'netSupportShowModal' && STATE.netSupport) {
        STATE.netSupport.currentShowDeviceId = null;
    }
}

function showNotification(text) {
    const banner = document.getElementById('globalNotificationPill');
    const msgEl = document.getElementById('globalNotificationMsg');
    if (banner && msgEl) {
        msgEl.textContent = text;
        banner.classList.remove('hidden');
        setTimeout(() => banner.classList.add('hidden'), 4000);
    }
}

function showAnnouncementModal({ title, message, time }) {
    const modal = document.getElementById('announcementModal');
    if (modal) {
        document.getElementById('announcementTitle').textContent = title;
        document.getElementById('announcementText').textContent = message;
        document.getElementById('announcementTime').textContent = time;
        modal.classList.remove('hidden');
    }
}

function showTypingIndicator(nickname) {
    const el = document.getElementById('chatTypingIndicator');
    if (el) {
        el.textContent = `${nickname} يكتب الآن...`;
        el.classList.remove('hidden');
    }
}

function hideTypingIndicator() {
    const el = document.getElementById('chatTypingIndicator');
    if (el) el.classList.add('hidden');
}

function setDisappearingTimer(seconds) {
    STATE.disappearingSeconds = seconds;
    const btn = document.getElementById('disappearingToggleBtn');
    if (btn) {
        if (seconds > 0) {
            btn.innerHTML = `🔥 ${seconds}s`;
            btn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30';
        } else {
            btn.innerHTML = `مؤقت`;
            btn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white border border-slate-700';
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

function connectToEnteredHost() {
    const input = document.getElementById('targetHostIpInput');
    let target = input ? input.value.trim() : '';
    if (!target) {
        alert('يرجى كتابة عنوان IP السيرفر أولاً!');
        return;
    }
    target = target.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    let host = target;
    let port = 5000;
    if (target.includes(':')) {
        const parts = target.split(':');
        host = parts[0];
        port = parts[1];
    }
    localStorage.setItem('no2ta_custom_host_ip', host);
    window.location.href = `http://${host}:${port}`;
}

// ----------------------------------------------------
// 12. Setup Event Listeners
// ----------------------------------------------------
function setupEventListeners() {
    // Auth Form
    const authForm = document.getElementById('authForm');
    if (authForm) authForm.addEventListener('submit', handleLoginSubmit);

    // Chat Message Form
    const chatForm = document.getElementById('chatForm');
    if (chatForm) chatForm.addEventListener('submit', handleSendMessage);

    // Typing Input emitter
    const msgInput = document.getElementById('messageInput');
    let typingTimer = null;
    if (msgInput) {
        msgInput.addEventListener('input', () => {
            if (STATE.socket && STATE.user) {
                STATE.socket.emit('typing_start', {
                    userId: STATE.user.id,
                    nickname: STATE.user.nickname
                });
                clearTimeout(typingTimer);
                typingTimer = setTimeout(() => {
                    STATE.socket.emit('typing_stop', { userId: STATE.user.id });
                }, 1500);
            }
        });
    }

    // Media File Attachment Picker
    const filePicker = document.getElementById('chatFileInput');
    if (filePicker) {
        filePicker.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/upload/media', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) {
                    sendChatMessagePayload({
                        mediaUrl: data.url,
                        mediaType: data.type,
                        mediaName: data.name,
                        mediaSize: data.size
                    });
                }
            } catch (err) {
                alert('فشل رفع الملف!');
            }
        });
    }

    // Voice Record Button
    const voiceBtn = document.getElementById('voiceRecordBtn');
    if (voiceBtn) voiceBtn.addEventListener('click', toggleVoiceRecording);

    const voiceCancelBtn = document.getElementById('voiceCancelBtn');
    if (voiceCancelBtn) voiceCancelBtn.addEventListener('click', cancelVoiceRecording);

    // AirDrop Drag and Drop
    const airdropDropZone = document.getElementById('airdropDropZone');
    const airdropFileInput = document.getElementById('airdropFileInput');
    if (airdropDropZone && airdropFileInput) {
        airdropDropZone.addEventListener('click', () => airdropFileInput.click());
        airdropFileInput.addEventListener('change', (e) => handleAirDropUpload(e.target.files[0]));

        airdropDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            airdropDropZone.classList.add('border-cyan-400', 'bg-cyan-500/10');
        });
        airdropDropZone.addEventListener('dragleave', () => {
            airdropDropZone.classList.remove('border-cyan-400', 'bg-cyan-500/10');
        });
        airdropDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            airdropDropZone.classList.remove('border-cyan-400', 'bg-cyan-500/10');
            if (e.dataTransfer.files.length > 0) {
                handleAirDropUpload(e.dataTransfer.files[0]);
            }
        });
    }

    // Story Create Form
    const storyForm = document.getElementById('storyCreateForm');
    if (storyForm) storyForm.addEventListener('submit', handleCreateStorySubmit);

    // Profile Edit Form
    const profileForm = document.getElementById('profileEditForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!STATE.user) return;
            const nickname = document.getElementById('editNickname').value.trim();
            const bio = document.getElementById('editBio').value.trim();
            const avatar = STATE.pendingEditAvatarUrl || document.querySelector('input[name="editAvatar"]:checked')?.value;

            try {
                const res = await fetch('/api/users/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: STATE.user.id,
                        nickname: nickname || undefined,
                        avatar: avatar || undefined,
                        bio: bio || undefined
                    })
                });
                const data = await res.json();
                if (data.success) {
                    STATE.user = data.user;
                    STATE.pendingEditAvatarUrl = null;
                    localStorage.setItem('no2ta_user', JSON.stringify(data.user));
                    updateProfileUI();
                    loadUsers(); // Refresh sidebar
                    hideModal('profileModal');
                    showNotification('تم تحديث بروفايلك بنجاح! 🚀');
                }
            } catch (err) {
                alert('فشل تحديث البروفايل!');
            }
        });
    }

    // Avatar Upload Listeners (From Device)
    const editAvatarFileInput = document.getElementById('editAvatarFileInput');
    if (editAvatarFileInput) {
        editAvatarFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                const previewEl = document.getElementById('editAvatarCustomPreview');
                if (previewEl) previewEl.innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-cover rounded-full" />`;
            };
            reader.readAsDataURL(file);

            const formData = new FormData();
            formData.append('avatar', file);
            try {
                showNotification('جاري رفع صورة البروفايل...');
                const res = await fetch('/api/upload/avatar', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) {
                    STATE.pendingEditAvatarUrl = data.url;
                    document.querySelectorAll('input[name="editAvatar"]').forEach(r => r.checked = false);
                    showNotification('تم رفع الصورة بنجاح! 📷 اضغط حفظ التعديلات');
                }
            } catch (err) {
                alert('فشل رفع صورة البروفايل!');
            }
        });
    }

    const authAvatarFileInput = document.getElementById('authAvatarFileInput');
    if (authAvatarFileInput) {
        authAvatarFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                const previewEl = document.getElementById('authAvatarCustomPreview');
                if (previewEl) previewEl.innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-cover rounded-full" />`;
            };
            reader.readAsDataURL(file);

            const formData = new FormData();
            formData.append('avatar', file);
            try {
                const res = await fetch('/api/upload/avatar', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) {
                    STATE.pendingAuthAvatarUrl = data.url;
                    document.querySelectorAll('input[name="authAvatar"]').forEach(r => r.checked = false);
                    showNotification('تم اختيار صورتك الشخصية بنجاح! 📷');
                }
            } catch (err) {
                alert('فشل رفع الصورة!');
            }
        });
    }

    // Story File Preview Listeners
    const storyFileInput = document.getElementById('storyFileInput');
    if (storyFileInput) {
        storyFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const img = document.getElementById('storyImagePreview');
                        if (img) img.src = ev.target.result;
                        const emptyState = document.getElementById('storyFileEmptyState');
                        const previewState = document.getElementById('storyFilePreviewState');
                        if (emptyState) emptyState.classList.add('hidden');
                        if (previewState) previewState.classList.remove('hidden');
                    };
                    reader.readAsDataURL(file);
                } else {
                    const emptyState = document.getElementById('storyFileEmptyState');
                    const previewState = document.getElementById('storyFilePreviewState');
                    if (emptyState) emptyState.classList.add('hidden');
                    if (previewState) previewState.classList.remove('hidden');
                }
            }
        });
    }

    // Stealth Iframe Message Listener
    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'NO2TA_STEALTH_RESTORE') {
            STATE.localStealthSuppressed = true;
            releaseStealthMode();
        } else if (e.data && e.data.type === 'NO2TA_LOCAL_STEALTH_CLOSE') {
            // Password verified inside iframe: close on THIS device only!
            STATE.localStealthSuppressed = true;
            releaseStealthMode({ message: 'تم إغلاق شاشة التمويه على جهازك فقط 🤫' });
        } else if (e.data && e.data.type === 'NO2TA_TRIGGER_PANIC') {
            // F2 pressed inside iframe: trigger panic on everyone!
            triggerPanicButton();
        }
    });

    // CodePad / Plain Text Bin Listeners
    const codepadArea = document.getElementById('sharedCodePadTextarea');
    if (codepadArea) {
        codepadArea.addEventListener('input', handleCodePadInput);
        codepadArea.addEventListener('keydown', handleTextareaTabKey);
    }

    const snippetArea = document.getElementById('snippetCodeInput');
    if (snippetArea) {
        snippetArea.addEventListener('keydown', handleTextareaTabKey);
    }

    const snippetForm = document.getElementById('codeSnippetForm');
    if (snippetForm) {
        snippetForm.addEventListener('submit', handleCodeSnippetSubmit);
    }
}

function logoutCurrentUser() {
    if (confirm('هل تريد تسجيل الخروج من نؤطة؟')) {
        localStorage.removeItem('no2ta_user');
        window.location.reload();
    }
}

// ====================================================
// 14. NetSupport Classroom Monitor & Remote Control 🖥️⚡
// ====================================================

async function openNetSupportModal() {
    const modal = document.getElementById('netSupportModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    await refreshNetSupportDevices();

    // Start auto-refresh interval while modal is open (every 3 seconds)
    if (STATE.netSupport.pollInterval) clearInterval(STATE.netSupport.pollInterval);
    STATE.netSupport.pollInterval = setInterval(refreshNetSupportDevices, 3000);
}

async function refreshNetSupportDevices() {
    try {
        const res = await fetch('/api/netsupport/devices');
        if (!res.ok) {
            if (res.status === 403) {
                console.warn('NetSupport: Unauthorized device');
            }
            return;
        }
        const data = await res.json();
        const devices = data.devices || [];
        STATE.netSupport.devices = devices;

        // Update stats
        const totalEl = document.getElementById('netSupportStatsTotal');
        const screensEl = document.getElementById('netSupportStatsScreens');
        const headerCountEl = document.getElementById('netSupportOnlineCount');
        
        if (totalEl) totalEl.textContent = devices.length;
        if (screensEl) screensEl.textContent = devices.filter(d => !!d.lastFrame).length;
        if (headerCountEl) headerCountEl.textContent = devices.length;

        renderNetSupportGrid(devices);
    } catch (err) {
        console.error('Failed to refresh NetSupport devices:', err);
    }
}

function renderNetSupportGrid(devices) {
    const container = document.getElementById('netSupportGridContainer');
    if (!container) return;

    if (!devices || devices.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-16 flex flex-col items-center justify-center text-center text-slate-500">
                <span class="text-5xl mb-3">🖥️</span>
                <p class="text-sm font-bold text-slate-300 mb-1">لا توجد أجهزة متصلة بالمعمل حالياً</p>
                <p class="text-xs text-slate-500 max-w-sm mb-4">عندما يفتح الطلاب نؤطة أو يتم تشغيل lab-agent.bat ستظهر شاشاتهم هنا فوراً وبشكل حي!</p>
                <button onclick="openNetSupportAgentGuideModal()" class="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition">
                    📖 طريقة تشغيل عميل المعمل (lab-agent.bat)
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = devices.map(dev => {
        const isLocked = !!dev.isLocked;
        const isStealth = !!dev.isStealth;
        const hasFrame = !!dev.lastFrame;
        const lastSeenSec = dev.lastFrameAt ? Math.round((Date.now() - dev.lastFrameAt) / 1000) : null;
        const timeAgoText = lastSeenSec !== null ? (lastSeenSec < 6 ? 'مباشر الآن' : `منذ ${lastSeenSec} ثانية`) : 'لا توجد لقطة';

        // Resolve real student name from STATE.users or STATE.allUsers if dev.nickname is generic
        let studentName = dev.nickname;
        let studentAvatar = dev.avatar;
        if (!studentName || studentName === 'طالب' || studentName.startsWith('جهاز_') || studentName.startsWith('طالب_')) {
            const matchedUser = (STATE.users || []).find(u => 
                (dev.userId && u.id === dev.userId) || 
                (dev.ip && (u.ip_address === dev.ip || u.ip === dev.ip)) || 
                (dev.mac && u.mac_address && u.mac_address === dev.mac)
            );
            if (matchedUser && matchedUser.nickname) {
                studentName = matchedUser.nickname;
                if (matchedUser.avatar) studentAvatar = matchedUser.avatar;
            }
        }
        if (!studentName || studentName === 'طالب') {
            studentName = `طالب (${dev.ip ? dev.ip.split('.').pop() : 'جهاز'})`;
        }

        const safeNick = escapeHtml(studentName);
        const safeIp = escapeHtml(dev.ip || '');
        const safeApp = dev.currentApp ? escapeHtml(dev.currentApp) : 'سطح المكتب';

        return `
            <div class="glass-panel rounded-2xl p-3 border ${isLocked ? 'border-red-500/60 bg-red-950/20' : 'border-white/10 bg-slate-900/60'} flex flex-col justify-between transition-all hover:border-cyan-500/50 shadow-lg group">
                <!-- Header -->
                <div class="flex items-center justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm overflow-hidden shrink-0 border border-white/10 shadow-sm">
                            ${renderAvatarHTML(studentAvatar, 'w-full h-full')}
                        </div>
                        <div class="min-w-0">
                            <div class="flex items-center gap-1.5">
                                <h4 id="device_title_${dev.deviceId}" class="text-xs font-black text-white truncate max-w-[130px]" title="${safeNick}">${safeNick}</h4>
                                ${dev.role === 'admin' ? '<span class="text-micro px-1 rounded bg-amber-500/20 text-amber-300 font-bold">معلم</span>' : ''}
                            </div>
                            <p class="text-micro text-slate-400 font-mono truncate">${safeIp}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1">
                        ${isLocked ? '<span class="text-micro px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-300 border border-red-500/40 font-bold animate-pulse">🔒 مقفول</span>' : ''}
                        ${isStealth ? '<span class="text-micro px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-bold">📚 تمويه</span>' : ''}
                    </div>
                </div>

                <!-- Screen Thumbnail / Preview -->
                <div class="relative w-full h-32 sm:h-36 bg-black rounded-xl overflow-hidden border border-white/5 flex items-center justify-center cursor-pointer group-hover:border-cyan-500/40 transition mb-2" onclick="openNetSupportShowModal('${dev.deviceId}')">
                    <img id="device_frame_${dev.deviceId}" src="${dev.lastFrame || ''}" class="w-full h-full object-contain ${hasFrame ? '' : 'hidden'}" alt="${safeNick} Screen" />
                    <div id="device_overlay_${dev.deviceId}" class="absolute inset-0 bg-cyan-950/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center ${hasFrame ? '' : 'hidden'}">
                        <span class="px-2.5 py-1 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black shadow-lg flex items-center gap-1 scale-95 group-hover:scale-100 transition">
                            👁️ تكبير Show
                        </span>
                    </div>

                    <!-- Placeholder when waiting for stream (Auto-sync without manual request) -->
                    <div id="device_placeholder_${dev.deviceId}" class="flex flex-col items-center justify-center gap-2 p-3 text-center ${hasFrame ? 'hidden' : ''}">
                        <div class="relative flex items-center justify-center w-10 h-10">
                            <span class="absolute w-8 h-8 rounded-full bg-cyan-500/20 animate-ping"></span>
                            <span class="relative text-2xl">🖥️</span>
                        </div>
                        <div class="flex items-center gap-1 text-[11px] text-cyan-300 font-medium">
                            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                            <span>بث الشاشة التلقائي نشط</span>
                        </div>
                        <span class="text-micro text-slate-500">جاري سحب لقطة الشاشة بدون طلب...</span>
                    </div>

                    <!-- Bottom Info Banner on Image -->
                    <div class="absolute bottom-1 inset-x-1.5 px-2 py-0.8 rounded-lg bg-black/80 backdrop-blur-sm flex items-center justify-between text-micro text-slate-300 font-mono pointer-events-none">
                        <span id="device_app_${dev.deviceId}" class="truncate max-w-[120px] text-slate-400" title="${safeApp}">${safeApp}</span>
                        <span id="device_status_${dev.deviceId}" class="${hasFrame ? 'text-emerald-400 font-bold' : 'text-cyan-400/80'}">${timeAgoText}</span>
                    </div>
                </div>

                <!-- Control Buttons -->
                <div class="grid grid-cols-4 gap-1 pt-1 border-t border-white/5">
                    <button onclick="openNetSupportShowModal('${dev.deviceId}')" class="py-1 px-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition flex items-center justify-center gap-1" title="عرض ملء الشاشة كـ Show">
                        <span>👁️</span>
                        <span class="hidden sm:inline">Show</span>
                    </button>
                    <button onclick="adminNetSupportDeviceControl('${isLocked ? 'unlock_screen' : 'lock_screen'}', '${dev.socketId}', '${dev.ip}')" class="py-1 px-1.5 rounded-lg ${isLocked ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/15 hover:bg-red-500/30 text-red-300 border border-red-500/30'} text-[11px] font-bold transition flex items-center justify-center gap-1" title="${isLocked ? 'إلغاء القفل' : 'قفل شاشة الطالب'}">
                        <span>${isLocked ? '🔓' : '🔒'}</span>
                        <span class="hidden sm:inline">${isLocked ? 'فتح' : 'قفل'}</span>
                    </button>
                    <button onclick="promptMessageToNetSupportDevice('${dev.socketId}', '${dev.ip}', '${safeNick}')" class="py-1 px-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition flex items-center justify-center gap-1" title="إرسال رسالة تنبيه منبثقة للطالب">
                        <span>💬</span>
                        <span class="hidden sm:inline">تنبيه</span>
                    </button>
                    <button onclick="adminNetSupportDeviceControl('play_alarm', '${dev.socketId}', '${dev.ip}')" class="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold transition flex items-center justify-center gap-1" title="رنين جرس إنذار على جهاز الطالب">
                        <span>🔔</span>
                        <span class="hidden sm:inline">إنذار</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function promptMessageToNetSupportDevice(socketId, ip, nickname) {
    const msg = prompt(`أدخل رسالة التنبيه التي ستظهر على شاشة ${nickname || 'الجهاز'}:`);
    if (msg && msg.trim()) {
        adminNetSupportDeviceControl('popup_message', socketId, ip, { message: msg.trim() });
    }
}

function openNetSupportShowModal(deviceId) {
    const dev = STATE.netSupport.devices.find(d => d.deviceId === deviceId);
    if (!dev) return;

    STATE.netSupport.currentShowDeviceId = deviceId;

    const modal = document.getElementById('netSupportShowModal');
    const avatarEl = document.getElementById('netSupportShowAvatar');
    const titleEl = document.getElementById('netSupportShowTitle');
    const subtitleEl = document.getElementById('netSupportShowSubtitle');
    const lockBtn = document.getElementById('netSupportShowLockBtn');
    const lockLabel = document.getElementById('netSupportShowLockLabel');
    const imgEl = document.getElementById('netSupportShowImage');
    const placeholderEl = document.getElementById('netSupportShowPlaceholder');

    if (avatarEl) avatarEl.innerHTML = renderAvatarHTML(dev.avatar, 'w-full h-full');
    if (titleEl) titleEl.textContent = `شاشة: ${dev.nickname || 'جهاز طالب'}`;
    if (subtitleEl) subtitleEl.textContent = `IP: ${dev.ip || ''} | MAC: ${dev.mac || 'N/A'} | التطبيق: ${dev.currentApp || 'Desktop'}`;

    if (lockBtn && lockLabel) {
        if (dev.isLocked) {
            lockBtn.className = 'px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer';
            lockLabel.textContent = 'إلغاء القفل 🔓';
        } else {
            lockBtn.className = 'px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer';
            lockLabel.textContent = 'قفل الشاشة 🔒';
        }
    }

    if (dev.lastFrame) {
        if (imgEl) {
            imgEl.src = dev.lastFrame;
            imgEl.classList.remove('hidden');
        }
        if (placeholderEl) placeholderEl.classList.add('hidden');
    } else {
        if (imgEl) imgEl.classList.add('hidden');
        if (placeholderEl) placeholderEl.classList.remove('hidden');
    }

    if (modal) modal.classList.remove('hidden');
}

function toggleCurrentShowLock() {
    if (!STATE.netSupport.currentShowDeviceId) return;
    const dev = STATE.netSupport.devices.find(d => d.deviceId === STATE.netSupport.currentShowDeviceId);
    if (!dev) return;

    const newLockState = !dev.isLocked;
    dev.isLocked = newLockState;

    const lockBtn = document.getElementById('netSupportShowLockBtn');
    const lockLabel = document.getElementById('netSupportShowLockLabel');
    if (lockBtn && lockLabel) {
        if (newLockState) {
            lockBtn.className = 'px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer';
            lockLabel.textContent = 'إلغاء القفل 🔓';
        } else {
            lockBtn.className = 'px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer';
            lockLabel.textContent = 'قفل الشاشة 🔒';
        }
    }

    adminNetSupportDeviceControl(newLockState ? 'lock_screen' : 'unlock_screen', dev.socketId, dev.ip);
}

function sendMsgToCurrentShowDevice() {
    if (!STATE.netSupport.currentShowDeviceId) return;
    const dev = STATE.netSupport.devices.find(d => d.deviceId === STATE.netSupport.currentShowDeviceId);
    if (!dev) return;
    promptMessageToNetSupportDevice(dev.socketId, dev.ip, dev.nickname);
}

function triggerAlarmCurrentShowDevice() {
    if (!STATE.netSupport.currentShowDeviceId) return;
    const dev = STATE.netSupport.devices.find(d => d.deviceId === STATE.netSupport.currentShowDeviceId);
    if (!dev) return;
    adminNetSupportDeviceControl('play_alarm', dev.socketId, dev.ip);
    showNotification(`تم إرسال إنذار صوتي لجهاز ${dev.nickname}! 🔔`);
}

async function adminNetSupportDeviceControl(action, targetSocketId, targetIp, payload = {}) {
    try {
        const res = await fetch('/api/netsupport/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, targetSocketId, targetIp, payload })
        });
        const data = await res.json();
        if (data.success) {
            showNotification(`تم تنفيذ الأمر بنجاح! ⚡`);
            await refreshNetSupportDevices();
        } else {
            alert(data.error || 'فشل إرسال أمر التحكم!');
        }
    } catch (err) {
        console.error('NetSupport control error:', err);
        showNotification('حدث خطأ أثناء إرسال أمر التحكم ⚠️');
    }
}

async function adminNetSupportGlobalAction(action) {
    if (action === 'lock_all') {
        if (confirm('هل أنت متأكد من قفل شاشات جميع الأجهزة في المعمل فوراً؟ 🔒')) {
            await adminNetSupportDeviceControl('lock_screen', 'all', 'all');
        }
    } else if (action === 'unlock_all') {
        await adminNetSupportDeviceControl('unlock_screen', 'all', 'all');
    } else if (action === 'stealth_all') {
        if (confirm('هل تريد تحويل جميع أجهزة المعمل لشاشة التمويه (مسألة فيزياء) فوراً؟ 📚')) {
            await adminNetSupportDeviceControl('force_stealth', 'all', 'all');
        }
    } else if (action === 'message_all') {
        const msg = prompt('اكتب رسالة التنبيه التي ستظهر لجميع الطلاب بالمعمل:');
        if (msg && msg.trim()) {
            await adminNetSupportDeviceControl('popup_message', 'all', 'all', { message: msg.trim() });
        }
    }
}

function openNetSupportAgentGuideModal() {
    const modal = document.getElementById('netSupportAgentGuideModal');
    if (modal) modal.classList.remove('hidden');
}

function handleNetSupportFrameUpdate(data) {
    if (!data || (!data.deviceId && !data.ip)) return;

    let dev = STATE.netSupport.devices.find(d => d.deviceId === data.deviceId || (data.ip && d.ip === data.ip));
    if (dev) {
        dev.lastFrame = data.lastFrame;
        dev.lastFrameAt = data.lastFrameAt || Date.now();
        if (data.currentApp) dev.currentApp = data.currentApp;
        if (typeof data.isLocked !== 'undefined') dev.isLocked = data.isLocked;
        if (typeof data.isStealth !== 'undefined') dev.isStealth = data.isStealth;
        if (data.nickname && data.nickname !== 'طالب') dev.nickname = data.nickname;
        if (data.avatar) dev.avatar = data.avatar;

        const titleEl = document.getElementById(`device_title_${dev.deviceId}`);
        if (titleEl && dev.nickname && dev.nickname !== 'طالب') {
            titleEl.textContent = dev.nickname;
            titleEl.title = dev.nickname;
        }
    }

    const targetDevId = dev ? dev.deviceId : data.deviceId;

    // Update active Show modal if currently viewing this device
    if (STATE.netSupport.currentShowDeviceId === targetDevId || STATE.netSupport.currentShowDeviceId === data.deviceId) {
        const imgEl = document.getElementById('netSupportShowImage');
        const placeholderEl = document.getElementById('netSupportShowPlaceholder');
        if (imgEl && data.lastFrame) {
            imgEl.src = data.lastFrame;
            imgEl.classList.remove('hidden');
        }
        if (placeholderEl && data.lastFrame) {
            placeholderEl.classList.add('hidden');
        }
    }

    // Update thumbnail in the grid
    const thumbImg = document.getElementById(`device_frame_${targetDevId}`) || document.getElementById(`device_frame_${data.deviceId}`);
    const placeholder = document.getElementById(`device_placeholder_${targetDevId}`) || document.getElementById(`device_placeholder_${data.deviceId}`);
    const overlay = document.getElementById(`device_overlay_${targetDevId}`) || document.getElementById(`device_overlay_${data.deviceId}`);
    const appEl = document.getElementById(`device_app_${targetDevId}`) || document.getElementById(`device_app_${data.deviceId}`);
    const statusEl = document.getElementById(`device_status_${targetDevId}`) || document.getElementById(`device_status_${data.deviceId}`);

    if (thumbImg && data.lastFrame) {
        thumbImg.src = data.lastFrame;
        thumbImg.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
        if (overlay) overlay.classList.remove('hidden');
    }
    if (appEl && data.currentApp) {
        appEl.textContent = data.currentApp;
        appEl.title = data.currentApp;
    }
    if (statusEl) {
        statusEl.textContent = 'مباشر الآن';
        statusEl.className = 'text-emerald-400 font-bold';
    }
}

// ----------------------------------------------------
// 14. NetSupport Zero-Request Student Screen Streaming
// ----------------------------------------------------
let isCapturingStudentFrame = false;

async function captureStudentLiveSnapshot() {
    if (!STATE.socket || !STATE.socket.connected || !STATE.user) return;
    if (STATE.user.role === 'admin') return; // Teacher doesn't capture own screen
    if (isCapturingStudentFrame) return; // Prevent overlapping runs

    isCapturingStudentFrame = true;
    try {
        let frameBase64 = null;
        let activeAppName = 'متصفح نؤطة';

        // Check if student minimized the browser or switched away from the tab
        if (document.hidden) {
            const canvas = document.createElement('canvas');
            canvas.width = 480;
            canvas.height = 270;
            const ctx = canvas.getContext('2d');

            // Dark alert canvas
            ctx.fillStyle = '#090d16';
            ctx.fillRect(0, 0, 480, 270);

            // Amber border
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 4;
            ctx.strokeRect(12, 12, 456, 246);

            // Alert Title
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ الطالب مصغر المتصفح / خارج النافذة', 240, 85);

            // Subtitle
            ctx.fillStyle = '#94a3b8';
            ctx.font = '14px system-ui, -apple-system, sans-serif';
            ctx.fillText('النافذة الحالية غير نشطة (Background / Out of Focus)', 240, 125);

            // Nickname + IP
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
            ctx.fillText(`${STATE.user.nickname || 'طالب'} (${STATE.user.ip || 'LAN'})`, 240, 165);

            // Timestamp
            ctx.fillStyle = '#64748b';
            ctx.font = '13px monospace';
            const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            ctx.fillText(`آخر نشاط مسجل: ${timeStr}`, 240, 205);

            frameBase64 = canvas.toDataURL('image/jpeg', 0.6);
            activeAppName = 'مصغر المتصفح (خارج نؤطة)';
        } else if (typeof window.html2canvas === 'function') {
            const canvas = await window.html2canvas(document.body, {
                scale: 0.28, // Fast, lightweight thumbnail for LAN
                logging: false,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#0a0d14'
            });
            frameBase64 = canvas.toDataURL('image/jpeg', 0.55);
            const activeTabName = document.querySelector('.nav-tab.active')?.textContent?.trim() || document.title || 'متصفح نؤطة';
            activeAppName = `نؤطة (${activeTabName})`;
        }

        if (frameBase64 && STATE.socket && STATE.socket.connected) {
            STATE.socket.emit('netsupport_client_frame', {
                frame: frameBase64,
                currentApp: activeAppName,
                userId: STATE.user?.id,
                nickname: STATE.user?.nickname,
                avatar: STATE.user?.avatar
            });
        }
    } catch (err) {
        console.debug('Zero-request screen capture error:', err);
    } finally {
        isCapturingStudentFrame = false;
    }
}

function startStudentAutoScreenStream() {
    if (STATE.netSupport && STATE.netSupport.studentAutoCaptureInterval) return;
    if (!STATE.netSupport) STATE.netSupport = {};

    // Don't auto-stream teacher's own screen back to teacher dashboard
    if (STATE.user && STATE.user.role === 'admin') return;

    // Trigger initial capture after short delay once connected
    const tryInitialCapture = () => {
        if (STATE.socket && STATE.socket.connected) {
            captureStudentLiveSnapshot();
        } else {
            setTimeout(tryInitialCapture, 1000);
        }
    };
    setTimeout(tryInitialCapture, 1500);

    // Continuous silent background capture every 2.5 seconds (zero requests, zero prompts)
    STATE.netSupport.studentAutoCaptureInterval = setInterval(() => {
        captureStudentLiveSnapshot();
    }, 2500);

    // Immediate capture on tab switch / window minimize
    document.addEventListener('visibilitychange', () => {
        captureStudentLiveSnapshot();
    });
}

async function promptStudentNetSupportScreenShare() {
    // Immediate fallback trigger
    captureStudentLiveSnapshot();
}


// ----------------------------------------------------
// 15. Alexandria Live Clock & Prayer Times Engine 🕌🕒
// ----------------------------------------------------
function calculateAlexandriaPrayersClient(date = new Date()) {
    const lat = 31.2001;
    const lng = 29.9187;

    let tzOffset = 2;
    try {
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', timeZoneName: 'shortOffset' });
        const parts = formatter.formatToParts(date);
        const tzPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+2';
        const match = tzPart.match(/([+-])(\d+)/);
        if (match) {
            tzOffset = match[1] === '-' ? -parseInt(match[2], 10) : parseInt(match[2], 10);
        }
    } catch (e) {
        tzOffset = 2;
    }

    const d = (date.getTime() / 86400000) - (date.getTimezoneOffset() / 1440) + 2440587.5;
    const D = d - 2451545.0;

    const g = (357.529 + 0.98560028 * D) % 360;
    const q = (280.459 + 0.98564736 * D) % 360;
    const L = (q + 1.915 * Math.sin(g * Math.PI / 180) + 0.020 * Math.sin(2 * g * Math.PI / 180)) % 360;

    const e = 23.439 - 0.00000036 * D;
    const RA = (Math.atan2(Math.cos(e * Math.PI / 180) * Math.sin(L * Math.PI / 180), Math.cos(L * Math.PI / 180)) * 180 / Math.PI + 360) % 360;

    let EqT = (q - RA) / 15;
    while (EqT > 12) EqT -= 24;
    while (EqT < -12) EqT += 24;

    const sinDec = Math.sin(e * Math.PI / 180) * Math.sin(L * Math.PI / 180);
    const Dec = Math.asin(sinDec);
    const latRad = lat * Math.PI / 180;

    const noonLocal = 12 - (lng / 15) - EqT + tzOffset;

    function getHA(angle) {
        const angleRad = angle * Math.PI / 180;
        const cosHA = (Math.sin(angleRad) - Math.sin(latRad) * Math.sin(Dec)) / (Math.cos(latRad) * Math.cos(Dec));
        if (cosHA > 1) return 0;
        if (cosHA < -1) return 180;
        return (Math.acos(cosHA) * 180 / Math.PI) / 15;
    }

    const haFajr = getHA(-19.5);
    const haSunrise = getHA(-0.8333);
    const asrAlt = Math.atan(1 / (1 + Math.tan(Math.abs(latRad - Dec)))) * 180 / Math.PI;
    const haAsr = getHA(asrAlt);
    const haSunset = getHA(-0.8333);
    const haIsha = getHA(-17.5);

    function fmt(hrs) {
        let totalMin = Math.round(hrs * 60);
        let h = Math.floor(totalMin / 60) % 24;
        let m = totalMin % 60;
        let p = h >= 12 ? 'م' : 'ص';
        let h12 = h % 12 === 0 ? 12 : h % 12;
        let padM = m < 10 ? '0' + m : '' + m;
        let padH = h < 10 ? '0' + h : '' + h;
        return {
            time24: `${padH}:${padM}`,
            time12: `${h12}:${padM} ${p}`,
            h,
            m,
            totalSec: h * 3600 + m * 60
        };
    }

    return {
        city: 'الإسكندرية',
        fajr: fmt(noonLocal - haFajr),
        sunrise: fmt(noonLocal - haSunrise),
        dhuhr: fmt(noonLocal + 0.02),
        asr: fmt(noonLocal + haAsr),
        maghrib: fmt(noonLocal + haSunset + 0.03),
        isha: fmt(noonLocal + haIsha)
    };
}

let alexandriaPrayersData = null;

function tickAlexandriaClockAndPrayers() {
    const now = new Date();

    // 1. Alexandria live clock
    let alexTimeStr = '--:--:--';
    let alexDateStr = '';
    try {
        alexTimeStr = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
            timeZone: 'Africa/Cairo',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).format(now);

        alexDateStr = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
            timeZone: 'Africa/Cairo',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(now);
    } catch (e) {
        alexTimeStr = now.toLocaleTimeString('ar-EG');
    }

    // 2. Ensure prayer calculations for today
    if (!alexandriaPrayersData) {
        alexandriaPrayersData = calculateAlexandriaPrayersClient(now);
    }

    const p = alexandriaPrayersData;

    // 3. Compute current Alexandria seconds from midnight
    let h = 0, m = 0, s = 0;
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Africa/Cairo',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
        }).formatToParts(now);
        h = parseInt(parts.find(x => x.type === 'hour')?.value || '0', 10);
        m = parseInt(parts.find(x => x.type === 'minute')?.value || '0', 10);
        s = parseInt(parts.find(x => x.type === 'second')?.value || '0', 10);
    } catch (e) {
        h = now.getHours();
        m = now.getMinutes();
        s = now.getSeconds();
    }
    const currentSec = h * 3600 + m * 60 + s;

    // 4. Find next prayer
    const prayerList = [
        { key: 'fajr', name: 'الفجر', sec: p.fajr.totalSec },
        { key: 'dhuhr', name: 'الظهر', sec: p.dhuhr.totalSec },
        { key: 'asr', name: 'العصر', sec: p.asr.totalSec },
        { key: 'maghrib', name: 'المغرب', sec: p.maghrib.totalSec },
        { key: 'isha', name: 'العشاء', sec: p.isha.totalSec }
    ];

    let nextPrayer = null;
    let diffSec = 0;

    for (const item of prayerList) {
        if (currentSec < item.sec) {
            nextPrayer = item;
            diffSec = item.sec - currentSec;
            break;
        }
    }

    if (!nextPrayer) {
        nextPrayer = prayerList[0];
        diffSec = (86400 - currentSec) + p.fajr.totalSec;
    }

    const remHours = Math.floor(diffSec / 3600);
    const remMins = Math.floor((diffSec % 3600) / 60);
    const remSecs = diffSec % 60;
    const shortCountdown = `${remHours > 0 ? remHours + ':' : ''}${remMins < 10 ? '0' + remMins : remMins}:${remSecs < 10 ? '0' + remSecs : remSecs}`;
    const detailedCountdown = `${remHours > 0 ? remHours + 'س و ' : ''}${remMins}د و ${remSecs}ث`;

    // 5. Update Header Pill
    const headerClock = document.getElementById('headerAlexandriaClock');
    const headerNextName = document.getElementById('headerNextPrayerName');
    const headerNextCountdown = document.getElementById('headerNextPrayerCountdown');
    if (headerClock) headerClock.textContent = alexTimeStr;
    if (headerNextName) headerNextName.textContent = nextPrayer.name;
    if (headerNextCountdown) headerNextCountdown.textContent = (remHours > 0 ? remHours + 'س و ' : '') + remMins + 'د';

    // 6. Update Sidebar Widget
    const sideClock = document.getElementById('sidebarAlexandriaClock');
    const sideDate = document.getElementById('sidebarAlexandriaDate');
    const sideNext = document.getElementById('sidebarAlexandriaNextCountdown');
    if (sideClock) sideClock.textContent = alexTimeStr;
    if (sideDate) sideDate.textContent = alexDateStr;
    if (sideNext) sideNext.textContent = `${nextPrayer.name} بعد ${shortCountdown}`;

    const prayerKeys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (const key of prayerKeys) {
        const valEl = document.getElementById(`prayer_time_${key}`);
        const cardEl = document.getElementById(`prayer_card_${key}`);
        if (valEl && p[key]) valEl.textContent = p[key].time12;
        if (cardEl) {
            if (key === nextPrayer.key) {
                cardEl.className = 'p-1 rounded-lg bg-emerald-500/25 border border-emerald-400/60 ring-1 ring-emerald-400/50 shadow-sm transition-all';
                if (valEl) valEl.className = 'text-micro font-black text-emerald-200 mt-0.5';
            } else {
                cardEl.className = 'p-1 rounded-lg bg-black/40 border border-white/5 transition-all';
                if (valEl) valEl.className = 'text-micro font-bold text-slate-300 mt-0.5';
            }
        }
    }

    // Update School Day Schedule & Periods (الحصص والبريك والمرواح)
    updateSchoolScheduleUI(now);

    // 7. Update Modal
    const modalClock = document.getElementById('modalAlexandriaLiveClock');
    const modalDate = document.getElementById('modalAlexandriaFullDate');
    const modalNextName = document.getElementById('modalNextPrayerName');
    const modalNextCountdown = document.getElementById('modalNextPrayerCountdown');
    if (modalClock) modalClock.textContent = alexTimeStr;
    if (modalDate) modalDate.textContent = alexDateStr;
    if (modalNextName) modalNextName.textContent = nextPrayer.name;
    if (modalNextCountdown) modalNextCountdown.textContent = `باقي: ${detailedCountdown}`;

    const modalKeys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (const key of modalKeys) {
        const mVal = document.getElementById(`modal_time_${key}`);
        const mRow = document.getElementById(`modal_row_${key}`);
        if (mVal && p[key]) mVal.textContent = p[key].time12;
        if (mRow) {
            if (key === nextPrayer.key) {
                mRow.className = 'p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900/90 border border-emerald-400/60 ring-1 ring-emerald-400/50 flex items-center justify-between transition-all shadow-md';
            } else if (key === 'sunrise') {
                mRow.className = 'p-2.5 rounded-xl bg-slate-900/40 border border-white/5 flex items-center justify-between text-slate-400 transition-all';
            } else {
                mRow.className = 'p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between transition-all';
            }
        }
    }
}

async function initAlexandriaPrayerEngine() {
    alexandriaPrayersData = calculateAlexandriaPrayersClient(new Date());
    tickAlexandriaClockAndPrayers();

    try {
        const res = await fetch('/api/alexandria-prayers');
        if (res.ok) {
            const data = await res.json();
            if (data && data.prayers) {
                alexandriaPrayersData = data.prayers;
                tickAlexandriaClockAndPrayers();
            }
        }
    } catch (err) {
        // Local calculation fallback is active
    }

    setInterval(tickAlexandriaClockAndPrayers, 1000);
}

function switchTimetableTab(tabName) {
    const tabBtnSchedule = document.getElementById('tabBtnSchoolSchedule');
    const tabBtnPrayers = document.getElementById('tabBtnPrayerTimes');
    const contentSchedule = document.getElementById('tabContentSchoolSchedule');
    const contentPrayers = document.getElementById('tabContentPrayerTimes');

    if (!tabBtnSchedule || !tabBtnPrayers || !contentSchedule || !contentPrayers) return;

    if (tabName === 'schedule') {
        tabBtnSchedule.className = 'flex-1 py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm cursor-pointer';
        tabBtnPrayers.className = 'flex-1 py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer';
        contentSchedule.classList.remove('hidden');
        contentPrayers.classList.add('hidden');
    } else {
        tabBtnPrayers.className = 'flex-1 py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm cursor-pointer';
        tabBtnSchedule.className = 'flex-1 py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer';
        contentPrayers.classList.remove('hidden');
        contentSchedule.classList.add('hidden');
    }
}

function openSchoolScheduleModal() {
    switchTimetableTab('schedule');
    tickAlexandriaClockAndPrayers();
    showModal('prayerTimesModal');
}

function openPrayerTimesModal(tab = 'prayers') {
    switchTimetableTab(tab);
    tickAlexandriaClockAndPrayers();
    showModal('prayerTimesModal');
}


// ----------------------------------------------------
// 16. Digital Tasbeeh & Classroom Barakah Engine 📿✨
// ----------------------------------------------------
const TASBEEH_AZKAR = [
    { id: 'subhanallah', title: 'سُبْحَانَ اللَّهِ', defaultTarget: 33 },
    { id: 'alhamdulillah', title: 'الْحَمْدُ لِلَّهِ', defaultTarget: 33 },
    { id: 'lailahaillallah', title: 'لَا إِلَهَ إِلَّا اللَّهُ', defaultTarget: 33 },
    { id: 'allahuakbar', title: 'اللَّهُ أَكْبَرُ', defaultTarget: 33 },
    { id: 'astaghfirullah', title: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', defaultTarget: 100 },
    { id: 'lahawla', title: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', defaultTarget: 100 },
    { id: 'salawat', title: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', defaultTarget: 100 },
    { id: 'subhan_wabihamdih', title: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ', defaultTarget: 100 },
    { id: 'hasbiyallah', title: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ', defaultTarget: 7 },
    { id: 'custom', title: 'ذِكْرٌ حُرٌّ', defaultTarget: 0 }
];

let tasbeehState = {
    selectedDhikrId: 'subhanallah',
    currentCount: 0,
    targetCount: 33,
    cycleCount: 1,
    soundEnabled: true,
    todayCount: 0,
    lifetimeCount: 0,
    classroomTotal: 0
};

// Web Audio API Sound Synthesizers for Offline Realistic Bead Click and Chime
function playTasbeehBeadClick() {
    if (!tasbeehState.soundEnabled) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Wooden bead click pitch
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650 + Math.random() * 50, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.035);

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.035);
    } catch (e) {}
}

function playTasbeehGoalChime() {
    if (!tasbeehState.soundEnabled) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);
            gain.gain.setValueAtTime(0.2, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.25);
        });
    } catch (e) {}
}

function loadTasbeehStats() {
    try {
        const saved = JSON.parse(localStorage.getItem('no2ta_tasbeeh_stats') || '{}');
        const todayStr = new Date().toISOString().split('T')[0];
        if (saved.date === todayStr) {
            tasbeehState.todayCount = saved.today || 0;
        } else {
            tasbeehState.todayCount = 0;
        }
        tasbeehState.lifetimeCount = saved.lifetime || 0;
        tasbeehState.soundEnabled = saved.sound !== false;
    } catch (e) {}
}

function saveTasbeehStats() {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem('no2ta_tasbeeh_stats', JSON.stringify({
            date: todayStr,
            today: tasbeehState.todayCount,
            lifetime: tasbeehState.lifetimeCount,
            sound: tasbeehState.soundEnabled
        }));
    } catch (e) {}
}

function renderTasbeehDhikrList() {
    const listEl = document.getElementById('tasbeehDhikrList');
    if (!listEl) return;

    listEl.innerHTML = TASBEEH_AZKAR.map(item => {
        const isSelected = item.id === tasbeehState.selectedDhikrId;
        return `
            <button onclick="selectTasbeehDhikr('${item.id}')" class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5'
            }">
                ${item.title}
            </button>
        `;
    }).join('');
}

function updateTasbeehUI() {
    const currentDhikr = TASBEEH_AZKAR.find(d => d.id === tasbeehState.selectedDhikrId) || TASBEEH_AZKAR[0];

    const titleEl = document.getElementById('tasbeehCurrentDhikrTitle');
    const countEl = document.getElementById('tasbeehCountDisplay');
    const targetEl = document.getElementById('tasbeehTargetDisplay');
    const cycleEl = document.getElementById('tasbeehCycleCount');
    const todayEl = document.getElementById('tasbeehTodayCount');
    const lifetimeEl = document.getElementById('tasbeehLifetimeCount');
    const classroomEl = document.getElementById('tasbeehClassroomTotal');
    const circleRing = document.getElementById('tasbeehProgressCircle');
    const soundIconOn = document.getElementById('tasbeehSoundIconOn');
    const soundIconOff = document.getElementById('tasbeehSoundIconOff');

    if (titleEl) titleEl.textContent = currentDhikr.title;
    if (countEl) countEl.textContent = tasbeehState.currentCount;
    if (targetEl) targetEl.textContent = tasbeehState.targetCount > 0 ? tasbeehState.targetCount : '∞';
    if (cycleEl) cycleEl.textContent = tasbeehState.cycleCount;
    if (todayEl) todayEl.textContent = tasbeehState.todayCount.toLocaleString('ar-EG');
    if (lifetimeEl) lifetimeEl.textContent = tasbeehState.lifetimeCount.toLocaleString('ar-EG');
    if (classroomEl) classroomEl.textContent = tasbeehState.classroomTotal.toLocaleString('ar-EG');
    if (soundIconOn) soundIconOn.classList.toggle('hidden', !tasbeehState.soundEnabled);
    if (soundIconOff) soundIconOff.classList.toggle('hidden', tasbeehState.soundEnabled);

    [33, 100, 0].forEach(val => {
        const btn = document.getElementById(`targetBtn_${val}`);
        if (btn) {
            if (tasbeehState.targetCount === val) {
                btn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 transition';
            } else {
                btn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition';
            }
        }
    });

    if (circleRing) {
        if (tasbeehState.targetCount > 0) {
            const fraction = Math.min(tasbeehState.currentCount / tasbeehState.targetCount, 1);
            const offset = 440 - (440 * fraction);
            circleRing.style.strokeDashoffset = offset;
            if (fraction >= 1) {
                circleRing.classList.remove('text-amber-400');
                circleRing.classList.add('text-emerald-400');
            } else {
                circleRing.classList.remove('text-emerald-400');
                circleRing.classList.add('text-amber-400');
            }
        } else {
            circleRing.style.strokeDashoffset = 0;
            circleRing.classList.remove('text-emerald-400');
            circleRing.classList.add('text-amber-400');
        }
    }
}

function incrementTasbeeh() {
    const currentDhikr = TASBEEH_AZKAR.find(d => d.id === tasbeehState.selectedDhikrId) || TASBEEH_AZKAR[0];

    if (navigator.vibrate) {
        try { navigator.vibrate(25); } catch (e) {}
    }

    const circle = document.getElementById('tasbeehCounterCircle');
    if (circle) {
        circle.classList.add('scale-95');
        setTimeout(() => circle.classList.remove('scale-95'), 120);
    }

    tasbeehState.currentCount++;
    tasbeehState.todayCount++;
    tasbeehState.lifetimeCount++;
    tasbeehState.classroomTotal++;

    if (tasbeehState.targetCount > 0 && tasbeehState.currentCount >= tasbeehState.targetCount) {
        playTasbeehGoalChime();
        tasbeehState.cycleCount++;

        if (circle) {
            circle.classList.add('ring-4', 'ring-emerald-400', 'bg-emerald-950/40');
            setTimeout(() => {
                circle.classList.remove('ring-4', 'ring-emerald-400', 'bg-emerald-950/40');
            }, 600);
        }

        const currentIdx = TASBEEH_AZKAR.findIndex(d => d.id === tasbeehState.selectedDhikrId);
        if (tasbeehState.targetCount === 33 && currentIdx >= 0 && currentIdx < 3) {
            tasbeehState.selectedDhikrId = TASBEEH_AZKAR[currentIdx + 1].id;
            tasbeehState.currentCount = 0;
            renderTasbeehDhikrList();
            showNotification(`ما شاء الله! تمت الدورة بنجاح. الذكر التالي: ${TASBEEH_AZKAR[currentIdx + 1].title} 🌟`);
        } else {
            tasbeehState.currentCount = 0;
        }
    }

    saveTasbeehStats();
    updateTasbeehUI();

    if (STATE.socket && STATE.socket.connected) {
        STATE.socket.emit('tasbeeh_increment', {
            count: 1,
            dhikrId: currentDhikr ? currentDhikr.id : 'subhanallah',
            dhikrTitle: currentDhikr ? currentDhikr.title : 'سُبْحَانَ اللَّهِ',
            senderName: STATE.user ? STATE.user.nickname : 'زميل'
        });
    } else {
        if (currentDhikr) {
            playDhikrAudioPhrase(currentDhikr.id, currentDhikr.title);
        }
    }
}

function resetCurrentTasbeeh() {
    if (confirm('هل تريد تصفير عداد الذكر الحالي والبدء من جديد؟ 🔄')) {
        tasbeehState.currentCount = 0;
        tasbeehState.cycleCount = 1;
        updateTasbeehUI();
    }
}

function setTasbeehTarget(target) {
    tasbeehState.targetCount = target;
    tasbeehState.currentCount = 0;
    updateTasbeehUI();
}

function selectTasbeehDhikr(dhikrId) {
    const item = TASBEEH_AZKAR.find(d => d.id === dhikrId);
    if (!item) return;

    tasbeehState.selectedDhikrId = dhikrId;
    tasbeehState.targetCount = item.defaultTarget;
    tasbeehState.currentCount = 0;
    tasbeehState.cycleCount = 1;

    renderTasbeehDhikrList();
    updateTasbeehUI();
}

function toggleTasbeehSound() {
    tasbeehState.soundEnabled = !tasbeehState.soundEnabled;
    saveTasbeehStats();
    updateTasbeehUI();
}

function openTasbeehModal() {
    loadTasbeehStats();
    renderTasbeehDhikrList();
    updateTasbeehUI();
    showModal('tasbeehModal');
}

function initTasbeehEngine() {
    loadTasbeehStats();

    fetch('/api/tasbeeh')
        .then(r => r.json())
        .then(d => {
            if (d && typeof d.total !== 'undefined') {
                tasbeehState.classroomTotal = d.total;
                const el = document.getElementById('tasbeehClassroomTotal');
                if (el) el.textContent = d.total.toLocaleString('ar-EG');
            }
        })
        .catch(() => {});

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ') {
            const modal = document.getElementById('tasbeehModal');
            if (modal && !modal.classList.contains('hidden')) {
                if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
                e.preventDefault();
                incrementTasbeeh();
            }
        }
    });
}


// ----------------------------------------------------
// 17. School Day Schedule & Countdown Engine (الحصص والبريك والمرواح) 🏫🔔
// ----------------------------------------------------
function calculateSchoolSchedule(now = new Date()) {
    let dayName = 'Sun';
    let h = 0, m = 0, s = 0;
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Africa/Cairo',
            weekday: 'short',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
        }).formatToParts(now);

        dayName = parts.find(p => p.type === 'weekday')?.value || 'Sun';
        h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
        s = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);
    } catch (e) {
        dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
        h = now.getHours();
        m = now.getMinutes();
        s = now.getSeconds();
    }

    const curSec = (h * 60 + m) * 60 + s;
    const isThursday = (dayName === 'Thu');
    const isWeekend = (dayName === 'Fri' || dayName === 'Sat');

    // 8 Sessions of 55 minutes each starting at 7:30 AM
    // Break at 11:10 for 40 minutes (ends 11:50)
    const schedule = [
        { type: 'session', num: 1, name: 'الحصة الأولى', startSec: (7 * 60 + 30) * 60, endSec: (8 * 60 + 25) * 60 },
        { type: 'session', num: 2, name: 'الحصة الثانية', startSec: (8 * 60 + 25) * 60, endSec: (9 * 60 + 20) * 60 },
        { type: 'session', num: 3, name: 'الحصة الثالثة', startSec: (9 * 60 + 20) * 60, endSec: (10 * 60 + 15) * 60 },
        { type: 'session', num: 4, name: 'الحصة الرابعة', startSec: (10 * 60 + 15) * 60, endSec: (11 * 60 + 10) * 60 },
        { type: 'break', num: 0, name: 'البريك / الفسحة ☕', startSec: (11 * 60 + 10) * 60, endSec: (11 * 60 + 50) * 60 },
        { type: 'session', num: 5, name: 'الحصة الخامسة', startSec: (11 * 60 + 50) * 60, endSec: (12 * 60 + 45) * 60 },
        { type: 'session', num: 6, name: 'الحصة السادسة', startSec: (12 * 60 + 45) * 60, endSec: (13 * 60 + 40) * 60 },
        { type: 'session', num: 7, name: 'الحصة السابعة', startSec: (13 * 60 + 40) * 60, endSec: (14 * 60 + 35) * 60 },
        { type: 'session', num: 8, name: 'الحصة الثامنة', startSec: (14 * 60 + 35) * 60, endSec: (15 * 60 + 30) * 60 }
    ];

    const breakStart = (11 * 60 + 10) * 60;
    const breakEnd = (11 * 60 + 50) * 60;
    const bionicStart = (15 * 60 + 30) * 60;
    const dismissalSec = isThursday ? (15 * 60 + 30) * 60 : (16 * 60) * 60;

    let currentItem = schedule.find(item => curSec >= item.startSec && curSec < item.endSec);
    let inBionic = (!isThursday && curSec >= bionicStart && curSec < dismissalSec);

    function fmtRemaining(sec) {
        if (sec <= 0) return '0د';
        const rh = Math.floor(sec / 3600);
        const rm = Math.floor((sec % 3600) / 60);
        const rs = sec % 60;
        if (rh > 0) return `${rh}س و ${rm}د`;
        if (rm > 0) return `${rm}د و ${rs}ث`;
        return `${rs}ث`;
    }

    // 1. Break text
    let breakText = '';
    let breakShortText = '';
    if (isWeekend) {
        breakText = 'إجازة الويك إند';
        breakShortText = 'ويك إند';
    } else if (curSec < breakStart) {
        breakText = 'فاضل: ' + fmtRemaining(breakStart - curSec);
        breakShortText = 'البريك: ' + fmtRemaining(breakStart - curSec);
    } else if (curSec >= breakStart && curSec < breakEnd) {
        breakText = 'شغال الآن! (فاضل ' + fmtRemaining(breakEnd - curSec) + ')';
        breakShortText = 'بريك (باقي ' + fmtRemaining(breakEnd - curSec) + ')';
    } else {
        breakText = 'انتهى البريك اليوم';
        breakShortText = 'انتهى البريك';
    }

    // 2. Dismissal text
    let dismissalText = '';
    if (isWeekend) {
        dismissalText = 'إجازة الويك إند';
    } else if (curSec < dismissalSec) {
        dismissalText = 'فاضل: ' + fmtRemaining(dismissalSec - curSec);
    } else {
        dismissalText = 'انتهى اليوم';
    }

    // 3. Bionic text
    let bionicText = '';
    if (isWeekend) {
        bionicText = 'إجازة';
    } else if (isThursday) {
        bionicText = 'مفيش الخميس';
    } else if (curSec < bionicStart) {
        bionicText = 'فاضل: ' + fmtRemaining(bionicStart - curSec);
    } else if (curSec >= bionicStart && curSec < dismissalSec) {
        bionicText = 'شغال الآن 🔬';
    } else {
        bionicText = 'انتهى اليوم';
    }

    // 4. Session status & timer
    let statusBadge = '';
    let sessionTimer = '';
    let sessionShortBadge = '';

    if (isWeekend) {
        statusBadge = 'إجازة نهاية الأسبوع';
        sessionShortBadge = 'ويك إند';
        sessionTimer = 'نلقاكم الأحد بإذن الله';
    } else if (currentItem) {
        const rem = currentItem.endSec - curSec;
        if (currentItem.type === 'break') {
            statusBadge = 'وقت البريك ☕ (11:10 - 11:50)';
            sessionShortBadge = 'بريك ☕';
            sessionTimer = 'نهاية البريك: ' + fmtRemaining(rem);
        } else {
            statusBadge = currentItem.name + ` (${currentItem.num})`;
            sessionShortBadge = `الحصة ${currentItem.num}`;
            sessionTimer = `فاضل ع الحصة ${currentItem.num}: ` + fmtRemaining(rem);
        }
    } else if (inBionic) {
        statusBadge = 'وقت البايونيك 🔬 (3:30 - 4:00)';
        sessionShortBadge = 'بايونيك 🔬';
        sessionTimer = 'فاضل ع المرواح: ' + fmtRemaining(dismissalSec - curSec);
    } else if (curSec < schedule[0].startSec) {
        statusBadge = 'قبل طابور اليوم (يبدأ 7:30 ص)';
        sessionShortBadge = 'قبل الحصص';
        sessionTimer = 'فاضل ع الحصة 1: ' + fmtRemaining(schedule[0].startSec - curSec);
    } else {
        statusBadge = 'انتهى اليوم الدراسي 🏠';
        sessionShortBadge = 'مرواح 🏠';
        sessionTimer = 'وقت المرواح 🏠 نراك غداً';
    }

    const timetableRows = [
        { num: 1, name: 'الحصة الأولى', time: '07:30 ص - 08:25 ص', duration: '55 دقيقة', icon: '1️⃣', startSec: (7 * 60 + 30) * 60, endSec: (8 * 60 + 25) * 60, type: 'session' },
        { num: 2, name: 'الحصة الثانية', time: '08:25 ص - 09:20 ص', duration: '55 دقيقة', icon: '2️⃣', startSec: (8 * 60 + 25) * 60, endSec: (9 * 60 + 20) * 60, type: 'session' },
        { num: 3, name: 'الحصة الثالثة', time: '09:20 ص - 10:15 ص', duration: '55 دقيقة', icon: '3️⃣', startSec: (9 * 60 + 20) * 60, endSec: (10 * 60 + 15) * 60, type: 'session' },
        { num: 4, name: 'الحصة الرابعة', time: '10:15 ص - 11:10 ص', duration: '55 دقيقة', icon: '4️⃣', startSec: (10 * 60 + 15) * 60, endSec: (11 * 60 + 10) * 60, type: 'session' },
        { num: 0, name: 'البريك / الفسحة المدرسية', time: '11:10 ص - 11:50 ص', duration: '40 دقيقة', icon: '☕', startSec: (11 * 60 + 10) * 60, endSec: (11 * 60 + 50) * 60, type: 'break' },
        { num: 5, name: 'الحصة الخامسة', time: '11:50 ص - 12:45 م', duration: '55 دقيقة', icon: '5️⃣', startSec: (11 * 60 + 50) * 60, endSec: (12 * 60 + 45) * 60, type: 'session' },
        { num: 6, name: 'الحصة السادسة', time: '12:45 م - 01:40 م', duration: '55 دقيقة', icon: '6️⃣', startSec: (12 * 60 + 45) * 60, endSec: (13 * 60 + 40) * 60, type: 'session' },
        { num: 7, name: 'الحصة السابعة', time: '01:40 م - 02:35 م', duration: '55 دقيقة', icon: '7️⃣', startSec: (13 * 60 + 40) * 60, endSec: (14 * 60 + 35) * 60, type: 'session' },
        { num: 8, name: 'الحصة الثامنة', time: '02:35 م - 03:30 م', duration: '55 دقيقة', icon: '8️⃣', startSec: (14 * 60 + 35) * 60, endSec: (15 * 60 + 30) * 60, type: 'session' },
        { num: 0, name: 'فترة البايونيك (Bionic)', time: '03:30 م - 04:00 م', duration: '30 دقيقة', icon: '🔬', startSec: (15 * 60 + 30) * 60, endSec: (16 * 60) * 60, type: 'bionic' },
        { num: 0, name: 'المرواح ونهاية اليوم الدراسي', time: isThursday ? '03:30 م فوراً' : '04:00 م', duration: 'نهاية اليوم', icon: '🏠', startSec: (isThursday ? 15.5 : 16) * 3600, endSec: 24 * 3600, type: 'dismissal' }
    ];

    return {
        isWeekend, isThursday, curSec, fmtRemaining,
        schedule, timetableRows,
        statusBadge, sessionShortBadge, sessionTimer,
        breakText, breakShortText,
        bionicText, dismissalText
    };
}

function updateSchoolScheduleUI(now = new Date()) {
    const school = calculateSchoolSchedule(now);

    // Update Header Pill
    const headerBadge = document.getElementById('headerSchoolStatusBadge');
    const headerBreak = document.getElementById('headerSchoolBreakCountdown');
    if (headerBadge) headerBadge.textContent = school.sessionShortBadge;
    if (headerBreak) headerBreak.textContent = school.breakShortText;

    // Update Sidebar Widget
    const sideSessionBadge = document.getElementById('sidebarSchoolSessionBadge');
    const sideSessionCountdown = document.getElementById('sidebarSchoolSessionCountdown');
    const sideBreakCountdown = document.getElementById('sidebarSchoolBreakCountdown');
    const sideBionicCountdown = document.getElementById('sidebarSchoolBionicCountdown');
    const sideDismissalCountdown = document.getElementById('sidebarSchoolDismissalCountdown');
    const sideDismissalLabel = document.getElementById('sidebarSchoolDismissalLabel');
    const sideBionicLabel = document.getElementById('sidebarSchoolBionicLabel');

    if (sideSessionBadge) sideSessionBadge.textContent = school.statusBadge;
    if (sideSessionCountdown) sideSessionCountdown.textContent = school.sessionTimer;
    if (sideBreakCountdown) sideBreakCountdown.textContent = school.breakText;
    if (sideBionicCountdown) sideBionicCountdown.textContent = school.bionicText;
    if (sideDismissalCountdown) sideDismissalCountdown.textContent = school.dismissalText;
    if (sideDismissalLabel) sideDismissalLabel.textContent = school.isThursday ? 'المرواح (3:30)' : 'المرواح (4:00)';
    if (sideBionicLabel) sideBionicLabel.textContent = school.isThursday ? 'مفيش بايونيك' : 'البايونيك (3:30)';

    // Update Modal Hero
    const mStatus = document.getElementById('modalSchoolCurrentStatus');
    const mTimer = document.getElementById('modalSchoolSessionTimer');
    const mBreak = document.getElementById('modalSchoolBreakTimer');
    const mBionic = document.getElementById('modalSchoolBionicTimer');
    const mDismissal = document.getElementById('modalSchoolDismissalTimer');
    const mBionicHeader = document.getElementById('modalSchoolBionicHeader');
    const mDismissalHeader = document.getElementById('modalSchoolDismissalHeader');

    if (mStatus) mStatus.textContent = school.statusBadge;
    if (mTimer) mTimer.textContent = school.sessionTimer;
    if (mBreak) mBreak.textContent = school.breakText;
    if (mBionic) mBionic.textContent = school.bionicText;
    if (mDismissal) mDismissal.textContent = school.dismissalText;
    if (mBionicHeader) mBionicHeader.textContent = school.isThursday ? '🔬 مفيش بايونيك' : '🔬 البايونيك (3:30)';
    if (mDismissalHeader) mDismissalHeader.textContent = school.isThursday ? '🏠 المرواح (3:30)' : '🏠 المرواح (4:00)';

    // Render Full Timetable Table Rows
    const container = document.getElementById('modalScheduleRowsContainer');
    if (container && school.timetableRows) {
        let rowsHtml = '';
        school.timetableRows.forEach(item => {
            const isBionicOnThu = (school.isThursday && item.type === 'bionic');
            const isActive = !school.isWeekend && !isBionicOnThu && (school.curSec >= item.startSec && school.curSec < item.endSec);
            const isPassed = !school.isWeekend && (school.curSec >= item.endSec) && !isBionicOnThu;
            
            let statusBadge = '';
            let rowBgClass = 'hover:bg-white/5 transition';

            if (school.isWeekend) {
                statusBadge = '<span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-micro">ويك إند</span>';
            } else if (isBionicOnThu) {
                statusBadge = '<span class="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-micro border border-purple-500/20">❌ مفيش بايونيك الخميس</span>';
                rowBgClass = 'opacity-40 line-through bg-black/20';
            } else if (isActive) {
                const rem = school.fmtRemaining(item.endSec - school.curSec);
                statusBadge = `<span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 text-micro animate-pulse">🟢 جارية الآن (باقي ${rem})</span>`;
                rowBgClass = 'bg-cyan-500/15 border-r-4 border-r-cyan-400 font-bold shadow-inner';
            } else if (isPassed) {
                statusBadge = '<span class="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-micro">✓ انتهت</span>';
                rowBgClass = 'opacity-60';
            } else {
                const until = school.fmtRemaining(item.startSec - school.curSec);
                statusBadge = `<span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-micro border border-white/5">قادمة (بعد ${until})</span>`;
            }

            const nameColor = item.type === 'break' ? 'text-amber-300 font-bold' : (item.type === 'bionic' ? 'text-purple-300 font-bold' : (item.type === 'dismissal' ? 'text-emerald-300 font-bold' : 'text-white font-medium'));

            rowsHtml += `
                <div class="p-2.5 flex items-center justify-between gap-2 ${rowBgClass}">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <span class="text-base shrink-0">${item.icon}</span>
                        <div class="truncate">
                            <span class="${nameColor} block truncate text-xs">${item.name}</span>
                            <span class="text-micro text-slate-400 font-mono block mt-0.5">${item.time} • <span class="text-slate-500">${item.duration}</span></span>
                        </div>
                    </div>
                    <div class="shrink-0 text-left">
                        ${statusBadge}
                    </div>
                </div>
            `;
        });
        container.innerHTML = rowsHtml;
    }

    const dayBadge = document.getElementById('modalScheduleDayBadge');
    if (dayBadge) {
        if (school.isWeekend) {
            dayBadge.textContent = 'إجازة الويك إند';
            dayBadge.className = 'text-micro px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 font-bold';
        } else if (school.isThursday) {
            dayBadge.textContent = 'يوم الخميس • المرواح 3:30 م (بدون بايونيك)';
            dayBadge.className = 'text-micro px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold';
        } else {
            dayBadge.textContent = '8 حصص + بريك + بايونيك (المرواح 4:00)';
            dayBadge.className = 'text-micro px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold';
        }
    }
}


// ----------------------------------------------------
// 18. Arabic Real Audio Voice & Synchronized Salawat Engine 🕋🔊
const DHIKR_AUDIO_MAP = {
    'subhanallah': '/audio/human_subhanallah.wav',
    'alhamdulillah': '/audio/human_alhamdulillah.wav',
    'lailahaillallah': '/audio/human_lailahaillallah.wav',
    'allahuakbar': '/audio/human_allahuakbar.wav',
    'astaghfirullah': '/audio/human_astaghfirullah.wav',
    'lahawla': '/audio/human_lahawla.wav',
    'salawat': '/audio/human_salawat.mp3',
    'subhan_wabihamdih': '/audio/human_subhan_wabihamdih.wav',
    'hasbiyallah': '/audio/hasbiyallah.mp3'
};

const SALAWAT_HUMAN_VOICES = {
    'voice1': '/audio/human_salawat.mp3',      // صلِّ على النبي ﷺ
    'voice2': '/audio/human_salawat_10.wav',   // اللهم صلِّ على محمد ﷺ
    'voice3': '/audio/human_salawat_15.wav'    // صلِّ على النبي ﷺ نداء
};

// Pre-create Audio instances for instant human voice playback
const PRELOADED_DHIKR_AUDIO = {};
Object.keys(DHIKR_AUDIO_MAP).forEach(key => {
    try {
        const aud = new Audio(DHIKR_AUDIO_MAP[key]);
        aud.preload = 'auto';
        PRELOADED_DHIKR_AUDIO[key] = aud;
    } catch (e) {}
});

const PRELOADED_SALAWAT_AUDIO = {};
Object.keys(SALAWAT_HUMAN_VOICES).forEach(key => {
    try {
        const aud = new Audio(SALAWAT_HUMAN_VOICES[key]);
        aud.preload = 'auto';
        PRELOADED_SALAWAT_AUDIO[key] = aud;
    } catch (e) {}
});

// Browsers block audio.play() that isn't triggered by a direct user gesture — which is
// exactly how Salawat/Dhikr broadcasts arrive (a socket event, not a click). Priming every
// preloaded clip with a muted play+pause the moment the student FIRST touches the page at
// all unlocks autoplay for the rest of the session, so later broadcasts never silently fail.
let audioUnlockedForSession = false;
function unlockAllPreloadedAudioOnce() {
    if (audioUnlockedForSession) return;
    audioUnlockedForSession = true;
    [...Object.values(PRELOADED_SALAWAT_AUDIO), ...Object.values(PRELOADED_DHIKR_AUDIO || {})].forEach(aud => {
        try {
            const wasMuted = aud.muted;
            aud.muted = true;
            const p = aud.play();
            if (p !== undefined) {
                p.then(() => { aud.pause(); aud.currentTime = 0; aud.muted = wasMuted; })
                 .catch(() => { aud.muted = wasMuted; });
            }
        } catch (e) {}
    });
    document.removeEventListener('click', unlockAllPreloadedAudioOnce);
    document.removeEventListener('touchstart', unlockAllPreloadedAudioOnce);
    document.removeEventListener('keydown', unlockAllPreloadedAudioOnce);
}
document.addEventListener('click', unlockAllPreloadedAudioOnce, { once: true });
document.addEventListener('touchstart', unlockAllPreloadedAudioOnce, { once: true });
document.addEventListener('keydown', unlockAllPreloadedAudioOnce, { once: true });

let activeDhikrAudio = null;
let salawatSelectedSound = 'voice1'; // ONLY human voices: 'voice1', 'voice2', 'voice3'

function selectSalawatVoice(type) {
    salawatSelectedSound = type || 'voice1';
    ['voice1', 'voice2', 'voice3'].forEach(vKey => {
        const btn = document.getElementById('voiceOpt_' + vKey);
        if (btn) {
            if (vKey === salawatSelectedSound) {
                btn.className = 'py-1 px-1.5 rounded-lg text-center transition bg-amber-500 text-slate-950 shadow-sm cursor-pointer border border-amber-400 font-bold';
            } else {
                btn.className = 'py-1 px-1.5 rounded-lg text-center transition bg-black/40 text-slate-300 hover:text-white cursor-pointer border border-white/5';
            }
        }
    });
    playSalawatVoice(salawatSelectedSound);
}

function testSalawatAudioVoice() {
    playSalawatVoice(salawatSelectedSound);
}

function playDhikrAudioPhrase(dhikrId, fallbackText = '') {
    if (!tasbeehState.soundEnabled) return;

    try {
        const audioSrc = DHIKR_AUDIO_MAP[dhikrId] || '/audio/human_subhanallah.wav';
        const fresh = new Audio(audioSrc);
        fresh.volume = 1.0;
        activeDhikrAudio = fresh;

        const playPromise = fresh.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.warn('Dhikr audio playback error (user interaction needed):', err);
            });
        }
    } catch (e) {
        console.error('playDhikrAudioPhrase error:', e);
    }
}

function showDhikrFloatingToast(data) {
    if (!data || !data.dhikrTitle) return;
    let toast = document.getElementById('globalDhikrToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalDhikrToast';
        toast.className = 'fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-slate-900/90 border border-emerald-500/50 shadow-2xl backdrop-blur-md text-white text-xs font-bold flex items-center gap-2 pointer-events-none transition-all duration-300 opacity-0 -translate-y-2';
        document.body.appendChild(toast);
    }

    toast.innerHTML = `<i data-lucide="circle-dot-dashed" class="w-4 h-4 text-emerald-400 shrink-0"></i> <span>${data.senderName || 'زميل'}:</span> <span class="text-emerald-300 font-black text-sm">${data.dhikrTitle}</span>`;
    renderIcons();
    toast.classList.remove('opacity-0', '-translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');

    if (window._dhikrToastTimer) clearTimeout(window._dhikrToastTimer);
    window._dhikrToastTimer = setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', '-translate-y-2');
    }, 2200);
}

function playSalawatVoice(soundType = 'voice1') {
    if (!tasbeehState.soundEnabled) return;

    const voiceKey = SALAWAT_HUMAN_VOICES[soundType] ? soundType : 'voice1';
    const soundPath = SALAWAT_HUMAN_VOICES[voiceKey];

    try {
        let audio = PRELOADED_SALAWAT_AUDIO[voiceKey];
        if (!audio) {
            audio = new Audio(soundPath);
            PRELOADED_SALAWAT_AUDIO[voiceKey] = audio;
        }

        audio.currentTime = 0;
        audio.volume = 1.0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.warn('Human Salawat voice play error, fresh fallback:', err);
                const fresh = new Audio(soundPath);
                fresh.volume = 1.0;
                fresh.play().catch(e => console.warn('Fresh salawat play error:', e));
            });
        }
    } catch (e) {
        console.error('playSalawatVoice error:', e);
    }
}

function playSalawatBellChime() {
    // Only used if audio completely fails
}

let salawatBannerTimer = null;

function handleSalawatBroadcast(data = {}) {
    console.log('🕋 [SALAWAT] Received synchronized broadcast across lab devices (HUMAN VOICE):', data);

    // 1. Play real human voice ONLY!
    const soundToPlay = (data && data.soundType && SALAWAT_HUMAN_VOICES[data.soundType]) ? data.soundType : (salawatSelectedSound || 'voice1');
    playSalawatVoice(soundToPlay);

    // 2. Show glowing banner across screen
    const banner = document.getElementById('globalSalawatBanner');
    if (banner) {
        banner.classList.remove('hidden');
        setTimeout(() => {
            banner.classList.remove('-translate-y-6', 'opacity-0');
            banner.classList.add('translate-y-0', 'opacity-100');
        }, 50);

        if (salawatBannerTimer) clearTimeout(salawatBannerTimer);
        salawatBannerTimer = setTimeout(() => {
            banner.classList.remove('translate-y-0', 'opacity-100');
            banner.classList.add('-translate-y-6', 'opacity-0');
            setTimeout(() => banner.classList.add('hidden'), 500);
        }, 7000);
    }
}

function triggerClassroomSalawat(soundType = null) {
    const selected = (soundType && SALAWAT_HUMAN_VOICES[soundType]) ? soundType : (salawatSelectedSound || 'voice1');
    if (STATE.socket && STATE.socket.connected) {
        STATE.socket.emit('admin_trigger_salawat', { soundType: selected });
        showNotification('تم إطلاق صوت "صلِّ على محمد ﷺ" (صوت بشري 🎙️) لجميع الأجهزة بالمعمل!');
    } else {
        handleSalawatBroadcast({ soundType: selected });
    }
}

~~~~


### المصدر: public/js/audio_synth.js

~~~~js
// Web Audio Synthesizer for Sleek Native Sounds
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playSend() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            const now = this.ctx.currentTime;
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {}
    }

    playReceive() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            const now = this.ctx.currentTime;
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.setValueAtTime(880, now + 0.06);   // A5
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.18);
        } catch (e) {}
    }

    playReaction() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            const now = this.ctx.currentTime;
            osc.frequency.setValueAtTime(700, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.06);
        } catch (e) {}
    }

    playAnnouncement() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                const startTime = this.ctx.currentTime + (idx * 0.09);
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0.18, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + 0.2);
            });
        } catch (e) {}
    }

    killAllAudio() {
        this.isMuted = true;
        if (this.ctx) {
            try {
                this.ctx.suspend();
            } catch (e) {}
        }
        // Also pause any HTML5 audio/video elements
        document.querySelectorAll('audio, video').forEach(el => {
            try {
                el.pause();
                el.currentTime = 0;
            } catch (e) {}
        });
    }

    resumeAudio() {
        this.isMuted = false;
        if (this.ctx) {
            try {
                this.ctx.resume();
            } catch (e) {}
        }
    }
}

window.soundEngine = new SoundEngine();

~~~~


### المصدر: public/stealth/flutter.html

~~~~html
<!DOCTYPE html>
<html lang="ar" dir="rtl" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>منصة التقييم والتدريب التفاعلي — مراجعة كفاءة وتطوير تطبيقات فلاتر (Flutter Competency)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Cairo', sans-serif; background-color: #030712; }
        .en-font { font-family: 'Plus Jakarta Sans', sans-serif; }
        .mono-font { font-family: 'JetBrains Mono', monospace; }
        .quiz-card { transition: all 0.25s ease-in-out; }
        .quiz-card:hover { border-color: rgba(6, 182, 212, 0.4); }
    </style>
</head>
<body class="bg-gray-950 text-slate-100 min-h-screen selection:bg-cyan-500 selection:text-black pb-28">

    <!-- Sticky Live Score & Control Header -->
    <header class="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 px-4 md:px-6 py-3 shadow-xl">
        <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white text-xl shadow-lg shadow-cyan-500/20 font-black">
                    💙
                </div>
                <div>
                    <h1 class="text-sm md:text-base font-extrabold text-white leading-tight flex items-center gap-2">
                        <span>اختبار وتقييم مهارات فلاتر التفاعلي</span>
                        <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold">Q121 - Q202</span>
                    </h1>
                    <span class="text-[11px] text-gray-400 en-font">Flutter Competency & Mobile App Development • Official Model Answers</span>
                </div>
            </div>

            <!-- Live Score Badges -->
            <div class="flex items-center gap-2 en-font text-xs">
                <div class="px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800 flex items-center gap-1.5 shadow-inner">
                    <span class="text-gray-400">Score:</span>
                    <span id="score-display" class="font-black text-cyan-400 text-sm">0</span>
                    <span class="text-gray-600">/</span>
                    <span id="total-questions-display" class="text-gray-400">71</span>
                </div>
                <div class="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1">
                    <span>✓</span>
                    <span id="correct-count">0</span>
                </div>
                <div class="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold flex items-center gap-1">
                    <span>✗</span>
                    <span id="wrong-count">0</span>
                </div>
                <div class="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-black" id="percentage-badge">
                    0%
                </div>
                <button onclick="toggleAllAnswers()" id="toggle-answers-btn" class="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition text-xs font-bold flex items-center gap-1 cursor-pointer">
                    👁️ <span class="hidden sm:inline">إظهار كافة الإجابات</span>
                </button>
                <button onclick="resetQuiz()" title="إعادة الاختبار بالكامل" class="px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition text-xs font-bold flex items-center gap-1 cursor-pointer">
                    🔄 <span class="hidden sm:inline">إعادة</span>
                </button>
            </div>
        </div>

        <!-- Progress Bar -->
        <div class="max-w-6xl mx-auto mt-2.5 w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div id="quiz-progress-bar" class="bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 h-full w-0 transition-all duration-300"></div>
        </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-8">

        <!-- Welcome Banner & Quick Jump Nav -->
        <div class="bg-gradient-to-r from-slate-900 via-gray-900 to-slate-950 border border-cyan-500/30 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
            <div class="absolute -right-10 -bottom-10 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                <div class="space-y-2">
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-xs font-bold border border-cyan-500/30">
                        <span>🚀</span> بنك أسئلة ونموذج إجابة مادة تطبيقات الهاتف (Flutter Competency)
                    </div>
                    <h2 class="text-xl md:text-2xl font-black text-white">
                        وضع الاختبار والتقييم الذاتي المتطابق مع الفايل 100% ⚡
                    </h2>
                    <p class="text-gray-300 text-xs md:text-sm leading-relaxed max-w-3xl">
                        جميع الأسئلة من <strong>Q121 إلى Q202</strong> مجهزة بنماذج الإجابة الأصلية نصياً وبدقة تامة. تم تفعيل خانات الكتابة في جميع الأقسام بما فيها قسم الشرح (Explain) لكتابة إجابتك بحرية والتحقق منها ومقارنتها بنموذج الفايل!
                    </p>
                </div>

                <div class="flex flex-wrap gap-1.5 items-center">
                    <a href="#section-complete" class="px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-cyan-500/20 hover:text-cyan-300 border border-gray-700 text-xs font-bold transition">1. أكمل (121-130)</a>
                    <a href="#section-correct" class="px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-cyan-500/20 hover:text-cyan-300 border border-gray-700 text-xs font-bold transition">2. التصويب (131-140)</a>
                    <a href="#section-terms" class="px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-cyan-500/20 hover:text-cyan-300 border border-gray-700 text-xs font-bold transition">3. مصطلحات (141-150)</a>
                    <a href="#section-explain" class="px-2.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 text-xs font-bold transition">✍️ 4. الشرح والكتابة (151-172)</a>
                    <a href="#section-tf" class="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold transition">5. صح وغلط (173-192)</a>
                    <a href="#section-mcq" class="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-bold transition">6. اختيارات (193-202)</a>
                </div>
            </div>
        </div>

        <!-- ==========================================
             SECTION 1: COMPLETE THE FOLLOWING SENTENCES (121 - 130)
             ========================================== -->
        <section id="section-complete" class="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 md:p-7 space-y-4 shadow-lg">
            <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">Q1</span>
                    <div>
                        <h2 class="text-base md:text-lg font-bold text-white">Complete the Following sentences</h2>
                        <span class="text-xs text-gray-400 en-font">Questions 121 to 130 (10 Questions)</span>
                    </div>
                </div>
                <span id="complete-score-badge" class="text-xs px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-bold">0 / 10 المحلول</span>
            </div>

            <div id="complete-container" class="space-y-3">
                <!-- Populated dynamically via JS -->
            </div>
        </section>


        <!-- ==========================================
             SECTION 2: CORRECT THE UNDERLINED WORD (131 - 140)
             ========================================== -->
        <section id="section-correct" class="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 md:p-7 space-y-4 shadow-lg">
            <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-black">Q2</span>
                    <div>
                        <h2 class="text-base md:text-lg font-bold text-white">Correct the underlined word for the following sentence</h2>
                        <span class="text-xs text-gray-400 en-font">Questions 131 to 140 (10 Questions)</span>
                    </div>
                </div>
                <span id="correct-score-badge" class="text-xs px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold">0 / 10 المحلول</span>
            </div>

            <div id="correct-container" class="space-y-3">
                <!-- Populated dynamically via JS -->
            </div>
        </section>


        <!-- ==========================================
             SECTION 3: WRITE THE TECHNICAL TERM (141 - 150)
             ========================================== -->
        <section id="section-terms" class="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 md:p-7 space-y-4 shadow-lg">
            <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-black">Q3</span>
                    <div>
                        <h2 class="text-base md:text-lg font-bold text-white">Write the Technical term which is this description</h2>
                        <span class="text-xs text-gray-400 en-font">Questions 141 to 150 (10 Questions)</span>
                    </div>
                </div>
                <span id="terms-score-badge" class="text-xs px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono font-bold">0 / 10 المحلول</span>
            </div>

            <div id="terms-container" class="space-y-3">
                <!-- Populated dynamically via JS -->
            </div>
        </section>


        <!-- ==========================================
             SECTION 4: EXPLAIN THE FOLLOWING (151 - 172) - WITH WRITING AREA ✍️
             ========================================== -->
        <section id="section-explain" class="bg-gray-900/90 border border-indigo-500/30 rounded-3xl p-5 md:p-7 space-y-4 shadow-lg">
            <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-black">Q4</span>
                    <div>
                        <h2 class="text-base md:text-lg font-bold text-white flex items-center gap-2">
                            <span>Explain the following sentences</span>
                            <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-normal">✍️ متاح لك الكتابة والتحقق الذاتي</span>
                        </h2>
                        <span class="text-xs text-gray-400 en-font">Questions 151 to 172 (11 Questions — Type & Verify with exact file answer)</span>
                    </div>
                </div>
                <span id="explain-score-badge" class="text-xs px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono font-bold">0 / 11 المحلول</span>
            </div>

            <div id="explain-container" class="space-y-4">
                <!-- Populated dynamically via JS -->
            </div>
        </section>


        <!-- ==========================================
             SECTION 5: WRITE TRUE OR FALSE (173 - 192)
             ========================================== -->
        <section id="section-tf" class="bg-gray-900/90 border border-emerald-500/30 rounded-3xl p-5 md:p-7 space-y-4 shadow-lg">
            <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black">Q5</span>
                    <div>
                        <h2 class="text-base md:text-lg font-bold text-white">Write True/False for the following Sentences</h2>
                        <span class="text-xs text-gray-400 en-font">Questions 173 to 192 (20 Questions — Interactive Click)</span>
                    </div>
                </div>
                <span id="tf-score-badge" class="text-xs px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">0 / 20 المحلول</span>
            </div>

            <div id="tf-container" class="space-y-3">
                <!-- Populated dynamically via JS -->
            </div>
        </section>


        <!-- ==========================================
             SECTION 6: MULTIPLE CHOICE QUESTIONS (193 - 202)
             ========================================== -->
        <section id="section-mcq" class="bg-gray-900/90 border border-cyan-500/30 rounded-3xl p-5 md:p-7 space-y-4 shadow-lg">
            <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">Q6</span>
                    <div>
                        <h2 class="text-base md:text-lg font-bold text-white">Multiple Choice Questions</h2>
                        <span class="text-xs text-gray-400 en-font">Questions 193 to 202 (10 Questions — Real-time Grading)</span>
                    </div>
                </div>
                <span id="mcq-score-badge" class="text-xs px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-bold">0 / 10 المحلول</span>
            </div>

            <div id="mcq-container" class="space-y-4">
                <!-- Populated dynamically via JS -->
            </div>
        </section>

    </main>

    <footer class="border-t border-gray-800 py-6 text-center text-xs text-gray-500 en-font">
        Flutter Competency & Mobile Development Exam Engine • Official Answers Verbatim • Real-time Interactive Grading
    </footer>

    <!-- ========================================================
         FLUTTER QUIZ DATA & EVALUATION ENGINE SCRIPT
         ======================================================== -->
    <script>
        // Global State
        const state = {
            totalQuestions: 71,
            score: 0,
            answered: 0,
            correct: 0,
            wrong: 0,
            userAnswers: {},
            showAllAnswers: false
        };

        // 1. DATA: Complete Section (121 - 130) - EXACT FILE ANSWERS
        const COMPLETE_QUESTIONS = [
            { id: 121, q: "A mobile app runs on devices like __________ and tablets.", ans: "Smartphones OR Mobiles OR Mobile phones", match: ["smartphones", "smart phones", "smartphone", "mobiles", "mobile", "mobile phones", "phone", "phones", "smart phone"] },
            { id: 122, q: "Flutter was created by __________ the company", ans: "Google", match: ["google", "google inc", "alphabet"] },
            { id: 123, q: "Instagram is an example of a __________ media app.", ans: "social", match: ["social", "social media"] },
            { id: 124, q: "A __________ is a small part of the screen in Flutter like a button or text.", ans: "widget", match: ["widget", "widgets"] },
            { id: 125, q: "The language used in Flutter is called __________", ans: "Dart", match: ["dart"] },
            { id: 126, q: "Facebook and Instagram are __________ media applications.", ans: "social", match: ["social", "social media"] },
            { id: 127, q: "Health apps help users track __________ and fitness", ans: "health", match: ["health", "healthy"] },
            { id: 128, q: "The first stage of app development is __________ and conceptualization", ans: "planning", match: ["planning", "plan"] },
            { id: 129, q: "UI stands for __________ Interface", ans: "User", match: ["user", "user's"] },
            { id: 130, q: "iOS is developed by __________.", ans: "Apple", match: ["apple", "apple inc"] }
        ];

        // 2. DATA: Correct Underlined Word (131 - 140) - EXACT FILE ANSWERS
        const CORRECT_QUESTIONS = [
            { id: 131, sentence: "Swift is mainly used for <span class='underline decoration-rose-400 font-bold text-rose-300'>Android</span> application development.", wrong: "Android", ans: "Java or Kotlin", match: ["java or kotlin", "java", "kotlin"] },
            { id: 132, sentence: "<span class='underline decoration-rose-400 font-bold text-rose-300'>Google Play Store</span> is used for publishing iOS applications.", wrong: "Google Play Store", ans: "Apple App", match: ["apple app", "apple app store", "app store", "apple store"] },
            { id: 133, sentence: "Google Play Store is used for publishing <span class='underline decoration-rose-400 font-bold text-rose-300'>iOS</span> applications.", wrong: "iOS", ans: "Android", match: ["android"] },
            { id: 134, sentence: "Swift is used for <span class='underline decoration-rose-400 font-bold text-rose-300'>Android</span> app development.", wrong: "Android", ans: "IOS", match: ["ios", "apple"] },
            { id: 135, sentence: "<span class='underline decoration-rose-400 font-bold text-rose-300'>iOS</span> apps are published on the Play store.", wrong: "iOS", ans: "Android", match: ["android"] },
            { id: 136, sentence: "iOS is developed by <span class='underline decoration-rose-400 font-bold text-rose-300'>Google</span> .", wrong: "Google", ans: "Apple", match: ["apple", "apple inc"] },
            { id: 137, sentence: "<span class='underline decoration-rose-400 font-bold text-rose-300'>UX</span> design focuses specifically on the buttons, colors, and layout of the app screens.", wrong: "UX", ans: "UI Or User interface", match: ["ui", "user interface", "ui or user interface"] },
            { id: 138, sentence: "Flutter uses the <span class='underline decoration-rose-400 font-bold text-rose-300'>Java</span> programming language to create high-performance mobile apps.", wrong: "Java", ans: "Dart", match: ["dart"] },
            { id: 139, sentence: "A widget that can change state is called <span class='underline decoration-rose-400 font-bold text-rose-300'>StatelessWidget</span>.", wrong: "StatelessWidget", ans: "StatefulWidget", match: ["statefulwidget", "stateful"] },
            { id: 140, sentence: "A widget that can’t change state is called <span class='underline decoration-rose-400 font-bold text-rose-300'>StatefulWidget</span>.", wrong: "StatefulWidget", ans: "StatelessWidget", match: ["statelesswidget", "stateless"] }
        ];

        // 3. DATA: Technical Terms (141 - 150) - EXACT FILE ANSWERS
        const TERMS_QUESTIONS = [
            { id: 141, desc: "It is a program that works on phones and tablets to help users do different tasks.", ans: "Mobile application", match: ["mobile application", "mobile app", "app", "mobile applications"] },
            { id: 142, desc: "It is a tool made by Google that helps developers create apps for phones, computers, and websites using one code.", ans: "Flutter", match: ["flutter"] },
            { id: 143, desc: "It is a small building block in Flutter, like a button, text, or image that you see on the screen.", ans: "widget", match: ["widget", "widgets"] },
            { id: 144, desc: "It is means creating one app that can work on different systems like Android and iOS at the same time.", ans: "Cross-platform development", match: ["cross-platform development", "cross platform development", "cross-platform", "cross platform"] },
            { id: 145, desc: "It is checking if the app works correctly and finding any problems or bugs before giving it to users.", ans: "Testing", match: ["testing", "software testing", "qa", "quality assurance"] },
            { id: 146, desc: "It is a widget that does not change its UI.", ans: "StatelessWidget", match: ["statelesswidget", "stateless"] },
            { id: 147, desc: "It is a widget that can change its UI during runtime.", ans: "StatefulWidget", match: ["statefulwidget", "stateful"] },
            { id: 148, desc: "It is provides app structure (AppBar, Drawer, Body).", ans: "Scaffold", match: ["scaffold"] },
            { id: 149, desc: "It shows title, actions, and navigation.", ans: "AppBar", match: ["appbar", "app bar"] },
            { id: 150, desc: "It is the programming language powering Flutter.", ans: "Dart", match: ["dart"] }
        ];

        // 4. DATA: Explain Questions (151 - 172) - EXACT FILE ANSWERS VERBATIM & KEYWORDS
        const EXPLAIN_QUESTIONS = [
            {
                id: '151-152',
                numText: '151 - 152',
                title: "Planning phase",
                ans: "It is the first step in mobile app development.",
                keywords: ["first step", "mobile app development", "mobile app", "development", "first"]
            },
            {
                id: '153-154',
                numText: '153 - 154',
                title: "Maintenance and Updates phase",
                ans: "It is an important stage after launching the mobile app.",
                keywords: ["important stage", "after launching", "launching", "mobile app", "updates"]
            },
            {
                id: '155-156',
                numText: '155 - 156',
                title: "Productivity Apps.",
                ans: "It helps users manage their time and work. like to-do lists.",
                keywords: ["manage", "time", "work", "to-do", "to-do lists"]
            },
            {
                id: '157-158',
                numText: '157 - 158',
                title: "Why do people use mobile apps?",
                ans: "People use mobile apps to make their lives easier, like playing games .",
                keywords: ["lives easier", "easier", "playing games", "games", "make their lives"]
            },
            {
                id: '159-160',
                numText: '159 - 160',
                title: "Why is Flutter popular?",
                ans: "It is popular because it's easy to learn, fast to develop with. Other answer and allows making apps for both Android and iPhone with the same code.",
                keywords: ["easy to learn", "fast to develop", "android and iphone", "same code", "easy", "fast"]
            },
            {
                id: '161-162',
                numText: '161 - 162',
                title: "What makes a good mobile app?",
                ans: "A good mobile app is easy to use and has easy UI",
                keywords: ["easy to use", "easy ui", "ui", "easy"]
            },
            {
                id: '163-164',
                numText: '163 - 164',
                title: "Why is documentation important in programming?",
                ans: "It is important because it helps developers understand how the code works and makes it easier for others to use.",
                keywords: ["understand how the code works", "code works", "understand", "easier for others"]
            },
            {
                id: '165-166',
                numText: '165 - 166',
                title: "Why is user interface (UI) important?",
                ans: "UI makes the app easy and enjoyable to use.",
                keywords: ["easy and enjoyable", "enjoyable", "easy to use", "enjoyable to use"]
            },
            {
                id: '167-168',
                numText: '167 - 168',
                title: "Explain git pull commands in git",
                ans: "Downloads updates FROM the remote repo TO your local repo",
                keywords: ["downloads updates", "downloads", "remote repo", "local repo", "remote", "local"]
            },
            {
                id: '169-170',
                numText: '169 - 170',
                title: "Explain git push commands in git",
                ans: "Uploads your local changes FROM local repo TO the remote repo",
                keywords: ["uploads your local changes", "uploads", "local repo", "remote repo", "remote", "local"]
            },
            {
                id: '171-172',
                numText: '171 - 172',
                title: "Why do we use the Navigator in apps?",
                ans: "To manage routes and navigate between different screens.",
                keywords: ["manage routes", "navigate between different screens", "routes", "navigate", "different screens", "screens"]
            }
        ];

        // 5. DATA: True/False Questions (173 - 192) - EXACT FILE ANSWERS
        const TF_QUESTIONS = [
            { id: 173, q: "Kotlin is used for iOS development.", correct: false, ansStr: "False" },
            { id: 174, q: "Native apps are typically faster than hybrid apps.", correct: true, ansStr: "True" },
            { id: 175, q: "Flutter uses Dart as its programming language.", correct: true, ansStr: "True" },
            { id: 176, q: "User feedback is not important after launching an app.", correct: false, ansStr: "False" },
            { id: 177, q: "A mobile app can be distributed through app stores.", correct: true, ansStr: "True" },
            { id: 178, q: "Developers must pay to publish apps on the Huawei App Gallery (Harmony OS).", correct: false, ansStr: "False" },
            { id: 179, q: "Identifying the target audience is the last step in the mobile app development process.", correct: false, ansStr: "False" },
            { id: 180, q: "Considering cross-platform development means creating an app for one specific OS only.", correct: false, ansStr: "False" },
            { id: 181, q: "Software Testing is the first step for developing apps", correct: false, ansStr: "False" },
            { id: 182, q: "Considering development expertise is not important when building a team", correct: false, ansStr: "False" },
            { id: 183, q: "User Interface (UI) focuses on design.", correct: true, ansStr: "True" },
            { id: 184, q: "UX stands for “Universal Experience.”", correct: false, ansStr: "False" },
            { id: 185, q: "Apple uses the Play Store to publish apps", correct: false, ansStr: "False" },
            { id: 186, q: "Android Studio is used for iOS development.", correct: false, ansStr: "False" },
            { id: 187, q: "Mobile apps can only run online.", correct: false, ansStr: "False" },
            { id: 188, q: "Planning is an important step before coding.", correct: true, ansStr: "True" },
            { id: 189, q: "The UI should be simple and user-friendly.", correct: true, ansStr: "True" },
            { id: 190, q: "Android apps are written only in C++.", correct: false, ansStr: "False" },
            { id: 191, q: "A layout controls how elements are displayed on screen.", correct: true, ansStr: "True" },
            { id: 192, q: "Testing is optional in app development.", correct: false, ansStr: "False" }
        ];

        // 6. DATA: Multiple Choice Questions (193 - 202) - EXACT FILE ANSWERS
        const MCQ_QUESTIONS = [
            {
                id: 193,
                q: "Which language is used with Flutter?",
                options: [
                    { label: "A) Java", val: "A" },
                    { label: "B) Dart", val: "B" },
                    { label: "C) C++", val: "C" },
                    { label: "D) Kotlin", val: "D" }
                ],
                correct: "B",
                fileAns: "B"
            },
            {
                id: 194,
                q: "Which app store is used for Android apps?",
                options: [
                    { label: "A) Apple App Store", val: "A" },
                    { label: "B) Microsoft Store", val: "B" },
                    { label: "C) Google Play Store", val: "C" },
                    { label: "D) Galaxy Store", val: "D" }
                ],
                correct: "C",
                fileAns: "C"
            },
            {
                id: 195,
                q: "Which language is used with React Native?",
                options: [
                    { label: "A) Java", val: "A" },
                    { label: "B) Swift", val: "B" },
                    { label: "C) JavaScript", val: "C" },
                    { label: "D) C++", val: "D" }
                ],
                correct: "C",
                fileAns: "C"
            },
            {
                id: 196,
                q: "Which stage ensures the app works correctly on different devices?",
                options: [
                    { label: "A) Planning", val: "A" },
                    { label: "B) Design", val: "B" },
                    { label: "C) Testing and Quality Assurance", val: "C" },
                    { label: "D) Deployment", val: "D" }
                ],
                correct: "C",
                fileAns: "C"
            },
            {
                id: 197,
                q: "What does the term \"API\" stand for?",
                options: [
                    { label: "A) Application Programming Interface", val: "A" },
                    { label: "B) Advanced Programming Interface", val: "B" },
                    { label: "C) Application Process Interface", val: "C" },
                    { label: "D) Automated Program Integration", val: "D" }
                ],
                correct: "A",
                fileAns: "A"
            },
            {
                id: 198,
                q: "Which stage involves creating the app’s visual design and layout?",
                options: [
                    { label: "A) Testing", val: "A" },
                    { label: "B) UI Development", val: "B" },
                    { label: "C) Deployment", val: "C" },
                    { label: "D) Maintenance", val: "D" }
                ],
                correct: "B",
                fileAns: "B"
            },
            {
                id: 199,
                q: "IOS is exclusive to ________ devices?",
                options: [
                    { label: "A) Samsung", val: "A" },
                    { label: "B) Google", val: "B" },
                    { label: "C) Microsoft", val: "C" },
                    { label: "D) Apple", val: "D" }
                ],
                correct: "D",
                fileAns: "D"
            },
            {
                id: 200,
                q: "What is the primary goal of identifying a target market?",
                options: [
                    { label: "a) To reduce app development time", val: "A" },
                    { label: "b) To understand user needs and preferences", val: "B" },
                    { label: "c) To increase app size", val: "C" },
                    { label: "d) To choose programming languages", val: "D" }
                ],
                correct: "B",
                fileAns: "B"
            },
            {
                id: 201,
                q: "Which of these is a productivity app?",
                options: [
                    { label: "a) Spotify", val: "A" },
                    { label: "b) Evernote", val: "B" },
                    { label: "c) Google Maps", val: "C" },
                    { label: "d) MyFitnessPal", val: "D" }
                ],
                correct: "B",
                fileAns: "B"
            },
            {
                id: 202,
                q: "Which step comes first in the mobile app development lifecycle?",
                options: [
                    { label: "a) Testing", val: "A" },
                    { label: "b) Deployment", val: "B" },
                    { label: "c) Planning and Conceptualization", val: "C" },
                    { label: "d) Maintenance", val: "D" }
                ],
                correct: "C",
                fileAns: "C"
            }
        ];

        // RENDER FUNCTIONS
        function renderCompleteSection() {
            const container = document.getElementById('complete-container');
            if (!container) return;
            container.innerHTML = COMPLETE_QUESTIONS.map(item => `
                <div class="quiz-card p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-2.5">
                    <div class="flex items-center justify-between gap-2">
                        <span class="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 font-mono text-xs font-bold">Q${item.id}</span>
                        <span id="complete-status-${item.id}" class="text-xs font-bold"></span>
                    </div>
                    <p class="text-sm md:text-base font-medium text-white en-font leading-relaxed">${item.q}</p>
                    <div class="flex flex-wrap items-center gap-2 pt-1">
                        <input type="text" id="complete-input-${item.id}" placeholder="اكتب الكلمة الناقصة..." class="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white text-xs en-font focus:outline-none focus:border-cyan-500 transition" onkeydown="if(event.key==='Enter') checkComplete(${item.id})">
                        <button onclick="checkComplete(${item.id})" class="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition cursor-pointer">تحقق</button>
                        <button onclick="revealComplete(${item.id})" class="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition cursor-pointer">نموذج الفايل</button>
                    </div>
                    <div id="complete-answer-${item.id}" class="hidden p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-bold en-font">
                        ✓ إجابة الفايل: <span class="text-white font-mono">${item.ans}</span>
                    </div>
                </div>
            `).join('');
        }

        function renderCorrectSection() {
            const container = document.getElementById('correct-container');
            if (!container) return;
            container.innerHTML = CORRECT_QUESTIONS.map(item => `
                <div class="quiz-card p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-2.5">
                    <div class="flex items-center justify-between gap-2">
                        <span class="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 font-mono text-xs font-bold">Q${item.id}</span>
                        <span id="correct-status-${item.id}" class="text-xs font-bold"></span>
                    </div>
                    <p class="text-sm md:text-base font-medium text-white en-font leading-relaxed">${item.sentence}</p>
                    <div class="flex flex-wrap items-center gap-2 pt-1">
                        <input type="text" id="correct-input-${item.id}" placeholder="اكتب التصويب..." class="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white text-xs en-font focus:outline-none focus:border-amber-500 transition" onkeydown="if(event.key==='Enter') checkCorrection(${item.id})">
                        <button onclick="checkCorrection(${item.id})" class="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-black transition cursor-pointer">تصويب</button>
                        <button onclick="revealCorrection(${item.id})" class="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition cursor-pointer">نموذج الفايل</button>
                    </div>
                    <div id="correct-answer-${item.id}" class="hidden p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-bold en-font">
                        ✓ إجابة الفايل: <span class="text-white font-mono">${item.ans}</span>
                    </div>
                </div>
            `).join('');
        }

        function renderTermsSection() {
            const container = document.getElementById('terms-container');
            if (!container) return;
            container.innerHTML = TERMS_QUESTIONS.map(item => `
                <div class="quiz-card p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-2.5">
                    <div class="flex items-center justify-between gap-2">
                        <span class="px-2.5 py-0.5 rounded-lg bg-teal-500/10 text-teal-400 font-mono text-xs font-bold">Q${item.id}</span>
                        <span id="terms-status-${item.id}" class="text-xs font-bold"></span>
                    </div>
                    <p class="text-sm md:text-base font-medium text-white en-font leading-relaxed">${item.desc}</p>
                    <div class="flex flex-wrap items-center gap-2 pt-1">
                        <input type="text" id="terms-input-${item.id}" placeholder="اكتب المصطلح (Technical term)..." class="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white text-xs en-font focus:outline-none focus:border-teal-500 transition" onkeydown="if(event.key==='Enter') checkTerm(${item.id})">
                        <button onclick="checkTerm(${item.id})" class="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition cursor-pointer">تحقق</button>
                        <button onclick="revealTerm(${item.id})" class="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition cursor-pointer">نموذج الفايل</button>
                    </div>
                    <div id="terms-answer-${item.id}" class="hidden p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-bold en-font">
                        ✓ إجابة الفايل: <span class="text-white font-mono">${item.ans}</span>
                    </div>
                </div>
            `).join('');
        }

        function renderExplainSection() {
            const container = document.getElementById('explain-container');
            if (!container) return;
            container.innerHTML = EXPLAIN_QUESTIONS.map(item => `
                <div class="quiz-card p-4 md:p-5 rounded-2xl bg-gray-950 border border-gray-800 space-y-3">
                    <div class="flex items-center justify-between gap-2">
                        <span class="px-2.5 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 font-mono text-xs font-bold">Q${item.numText}</span>
                        <span id="explain-status-${item.id}" class="text-xs font-bold"></span>
                    </div>
                    <h3 class="text-sm md:text-base font-bold text-white en-font">${item.title}</h3>
                    
                    <!-- Writing Area so student can type freely ✍️ -->
                    <div class="space-y-2">
                        <textarea id="explain-input-${item.id}" rows="2" placeholder="اكتب شرحك وإجابتك هنا..." class="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white text-xs md:text-sm en-font focus:outline-none focus:border-indigo-500 transition leading-relaxed"></textarea>
                        
                        <div class="flex flex-wrap items-center gap-2">
                            <button onclick="checkExplain('${item.id}')" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-sm">
                                ✍️ حفظ وتحقق من إجابتي
                            </button>
                            <button onclick="revealExplain('${item.id}')" class="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition cursor-pointer">
                                👁️ نموذج الفايل
                            </button>
                        </div>
                    </div>

                    <div id="explain-ans-${item.id}" class="hidden p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs md:text-sm text-indigo-200 leading-relaxed en-font">
                        <span class="font-bold text-white block mb-0.5">✓ إجابة الفايل بالضبط:</span>
                        <span class="text-white font-medium select-all">${item.ans}</span>
                    </div>
                </div>
            `).join('');
        }

        function renderTFSection() {
            const container = document.getElementById('tf-container');
            if (!container) return;
            container.innerHTML = TF_QUESTIONS.map(item => `
                <div class="quiz-card p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-2.5">
                    <div class="flex items-center justify-between gap-2">
                        <span class="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold">Q${item.id}</span>
                        <span id="tf-status-${item.id}" class="text-xs font-bold"></span>
                    </div>
                    <p class="text-sm md:text-base font-medium text-white en-font leading-relaxed">${item.q}</p>
                    <div class="flex items-center gap-3 pt-1">
                        <button onclick="answerTF(${item.id}, true)" id="tf-btn-true-${item.id}" class="flex-1 py-2 px-3 rounded-xl bg-gray-900 hover:bg-emerald-500/20 hover:text-emerald-300 border border-gray-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">
                            <span>✓</span>
                            <span>True</span>
                        </button>
                        <button onclick="answerTF(${item.id}, false)" id="tf-btn-false-${item.id}" class="flex-1 py-2 px-3 rounded-xl bg-gray-900 hover:bg-rose-500/20 hover:text-rose-300 border border-gray-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">
                            <span>✗</span>
                            <span>False</span>
                        </button>
                    </div>
                    <div id="tf-reason-${item.id}" class="hidden p-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-emerald-400 font-mono font-bold">
                        ✓ إجابة الفايل: ${item.ansStr}
                    </div>
                </div>
            `).join('');
        }

        function renderMCQSection() {
            const container = document.getElementById('mcq-container');
            if (!container) return;
            container.innerHTML = MCQ_QUESTIONS.map(item => `
                <div class="quiz-card p-4 md:p-5 rounded-2xl bg-gray-950 border border-gray-800 space-y-3">
                    <div class="flex items-center justify-between gap-2">
                        <span class="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 font-mono text-xs font-bold">Q${item.id}</span>
                        <span id="mcq-status-${item.id}" class="text-xs font-bold"></span>
                    </div>
                    <p class="text-sm md:text-base font-bold text-white en-font leading-relaxed">${item.q}</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        ${item.options.map(opt => `
                            <button onclick="answerMCQ(${item.id}, '${opt.val}')" id="mcq-btn-${item.id}-${opt.val}" class="text-right py-2.5 px-3.5 rounded-xl bg-gray-900 hover:bg-cyan-500/15 hover:border-cyan-500/30 border border-gray-800 text-xs md:text-sm font-medium text-gray-200 transition flex items-center justify-between cursor-pointer">
                                <span>${opt.label}</span>
                                <span id="mcq-icon-${item.id}-${opt.val}" class="opacity-0 font-bold">✓</span>
                            </button>
                        `).join('')}
                    </div>
                    <div id="mcq-exp-${item.id}" class="hidden p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-xs text-cyan-300 font-mono font-bold">
                        ✓ إجابة الفايل: (${item.fileAns})
                    </div>
                </div>
            `).join('');
        }

        // EVALUATION LOGIC
        function updateScoreHeader() {
            document.getElementById('score-display').textContent = state.score;
            document.getElementById('correct-count').textContent = state.correct;
            document.getElementById('wrong-count').textContent = state.wrong;
            const pct = state.totalQuestions > 0 ? Math.round((state.score / state.totalQuestions) * 100) : 0;
            document.getElementById('percentage-badge').textContent = pct + '%';
            document.getElementById('quiz-progress-bar').style.width = Math.min(100, Math.round((state.answered / state.totalQuestions) * 100)) + '%';
        }

        function checkComplete(id) {
            const item = COMPLETE_QUESTIONS.find(i => i.id === id);
            const input = document.getElementById(`complete-input-${id}`);
            const status = document.getElementById(`complete-status-${id}`);
            const ansBox = document.getElementById(`complete-answer-${id}`);
            if (!input || !item) return;

            const val = input.value.trim().toLowerCase();
            if (!val) return;

            const isCorrect = item.match.some(m => val.includes(m) || m.includes(val));
            if (!state.userAnswers['complete_' + id]) {
                state.answered++;
                if (isCorrect) {
                    state.score++;
                    state.correct++;
                } else {
                    state.wrong++;
                }
                state.userAnswers['complete_' + id] = true;
            }

            if (isCorrect) {
                input.className = 'flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500 text-emerald-300 text-xs en-font';
                status.innerHTML = '<span class="text-emerald-400 font-bold">✓ صحيح</span>';
                ansBox.classList.remove('hidden');
            } else {
                input.className = 'flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-500 text-rose-300 text-xs en-font';
                status.innerHTML = '<span class="text-rose-400 font-bold">✗ خطأ</span>';
                ansBox.classList.remove('hidden');
            }
            updateScoreHeader();
        }

        function revealComplete(id) {
            const box = document.getElementById(`complete-answer-${id}`);
            if (box) box.classList.toggle('hidden');
        }

        function checkCorrection(id) {
            const item = CORRECT_QUESTIONS.find(i => i.id === id);
            const input = document.getElementById(`correct-input-${id}`);
            const status = document.getElementById(`correct-status-${id}`);
            const ansBox = document.getElementById(`correct-answer-${id}`);
            if (!input || !item) return;

            const val = input.value.trim().toLowerCase();
            if (!val) return;

            const isCorrect = item.match.some(m => val.includes(m) || m.includes(val));
            if (!state.userAnswers['correct_' + id]) {
                state.answered++;
                if (isCorrect) {
                    state.score++;
                    state.correct++;
                } else {
                    state.wrong++;
                }
                state.userAnswers['correct_' + id] = true;
            }

            if (isCorrect) {
                input.className = 'flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500 text-emerald-300 text-xs en-font';
                status.innerHTML = '<span class="text-emerald-400 font-bold">✓ تصويب صحيح</span>';
                ansBox.classList.remove('hidden');
            } else {
                input.className = 'flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-500 text-rose-300 text-xs en-font';
                status.innerHTML = '<span class="text-rose-400 font-bold">✗ خطأ</span>';
                ansBox.classList.remove('hidden');
            }
            updateScoreHeader();
        }

        function revealCorrection(id) {
            const box = document.getElementById(`correct-answer-${id}`);
            if (box) box.classList.toggle('hidden');
        }

        function checkTerm(id) {
            const item = TERMS_QUESTIONS.find(i => i.id === id);
            const input = document.getElementById(`terms-input-${id}`);
            const status = document.getElementById(`terms-status-${id}`);
            const ansBox = document.getElementById(`terms-answer-${id}`);
            if (!input || !item) return;

            const val = input.value.trim().toLowerCase();
            if (!val) return;

            const isCorrect = item.match.some(m => val.includes(m) || m.includes(val));
            if (!state.userAnswers['term_' + id]) {
                state.answered++;
                if (isCorrect) {
                    state.score++;
                    state.correct++;
                } else {
                    state.wrong++;
                }
                state.userAnswers['term_' + id] = true;
            }

            if (isCorrect) {
                input.className = 'flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500 text-emerald-300 text-xs en-font';
                status.innerHTML = '<span class="text-emerald-400 font-bold">✓ مصطلح صحيح</span>';
                ansBox.classList.remove('hidden');
            } else {
                input.className = 'flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-500 text-rose-300 text-xs en-font';
                status.innerHTML = '<span class="text-rose-400 font-bold">✗ خطأ</span>';
                ansBox.classList.remove('hidden');
            }
            updateScoreHeader();
        }

        function revealTerm(id) {
            const box = document.getElementById(`terms-answer-${id}`);
            if (box) box.classList.toggle('hidden');
        }

        // Check Explain with Typed Answer & Smart Keyword Matching ✍️
        function checkExplain(id) {
            const item = EXPLAIN_QUESTIONS.find(i => i.id === id);
            const input = document.getElementById('explain-input-' + id);
            const status = document.getElementById('explain-status-' + id);
            const ansBox = document.getElementById('explain-ans-' + id);
            if (!input || !item) return;

            const val = input.value.trim().toLowerCase();
            if (!val) {
                alert('اكتب إجابتك أو شرحك في الخانة أولاً ثم اضغط تحقق ✍️');
                return;
            }

            // Keyword check
            const matchCount = item.keywords.filter(k => val.includes(k.toLowerCase())).length;
            const isGood = matchCount >= 1 || val.length >= 15;

            if (!state.userAnswers['explain_' + id]) {
                state.answered++;
                if (isGood) {
                    state.score++;
                    state.correct++;
                } else {
                    state.wrong++;
                }
                state.userAnswers['explain_' + id] = true;
            }

            if (isGood) {
                status.innerHTML = '<span class="text-emerald-400 font-bold">✓ إجابة ممتازة ومكتوبة!</span>';
                input.className = 'w-full px-3.5 py-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/50 text-white text-xs md:text-sm en-font leading-relaxed';
            } else {
                status.innerHTML = '<span class="text-amber-400 font-bold">قارن إجابتك بنموذج الفايل:</span>';
            }
            ansBox.classList.remove('hidden');
            updateScoreHeader();
        }

        function revealExplain(id) {
            const box = document.getElementById('explain-ans-' + id);
            if (box) box.classList.toggle('hidden');
        }

        function answerTF(id, userChoice) {
            const item = TF_QUESTIONS.find(i => i.id === id);
            const btnTrue = document.getElementById(`tf-btn-true-${id}`);
            const btnFalse = document.getElementById(`tf-btn-false-${id}`);
            const status = document.getElementById(`tf-status-${id}`);
            const reason = document.getElementById(`tf-reason-${id}`);
            if (!item || !btnTrue || !btnFalse) return;

            const isCorrect = (userChoice === item.correct);

            if (!state.userAnswers['tf_' + id]) {
                state.answered++;
                if (isCorrect) {
                    state.score++;
                    state.correct++;
                } else {
                    state.wrong++;
                }
                state.userAnswers['tf_' + id] = true;
            }

            if (item.correct === true) {
                btnTrue.className = 'flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white border border-emerald-400 text-xs font-black shadow-lg shadow-emerald-500/20';
                btnFalse.className = 'flex-1 py-2 px-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-500 text-xs opacity-50';
            } else {
                btnFalse.className = 'flex-1 py-2 px-3 rounded-xl bg-rose-600 text-white border border-rose-400 text-xs font-black shadow-lg shadow-rose-500/20';
                btnTrue.className = 'flex-1 py-2 px-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-500 text-xs opacity-50';
            }

            if (isCorrect) {
                status.innerHTML = '<span class="text-emerald-400 font-bold">✓ صحيح</span>';
            } else {
                status.innerHTML = '<span class="text-rose-400 font-bold">✗ خطأ</span>';
            }

            if (reason) reason.classList.remove('hidden');
            updateScoreHeader();
        }

        function answerMCQ(id, chosenVal) {
            const item = MCQ_QUESTIONS.find(i => i.id === id);
            const status = document.getElementById(`mcq-status-${id}`);
            const exp = document.getElementById(`mcq-exp-${id}`);
            if (!item) return;

            const isCorrect = (chosenVal === item.correct);

            if (!state.userAnswers['mcq_' + id]) {
                state.answered++;
                if (isCorrect) {
                    state.score++;
                    state.correct++;
                } else {
                    state.wrong++;
                }
                state.userAnswers['mcq_' + id] = true;
            }

            item.options.forEach(opt => {
                const btn = document.getElementById(`mcq-btn-${id}-${opt.val}`);
                const icon = document.getElementById(`mcq-icon-${id}-${opt.val}`);
                if (!btn) return;

                if (opt.val === item.correct) {
                    btn.className = 'text-right py-2.5 px-3.5 rounded-xl bg-emerald-950/50 border-2 border-emerald-500 text-emerald-200 text-xs md:text-sm font-bold shadow-lg shadow-emerald-500/10 flex items-center justify-between';
                    if (icon) {
                        icon.textContent = '✓ صح';
                        icon.className = 'opacity-100 text-emerald-400 font-black';
                    }
                } else if (opt.val === chosenVal && !isCorrect) {
                    btn.className = 'text-right py-2.5 px-3.5 rounded-xl bg-rose-950/50 border-2 border-rose-500 text-rose-200 text-xs md:text-sm font-bold flex items-center justify-between';
                    if (icon) {
                        icon.textContent = '✗ خطأ';
                        icon.className = 'opacity-100 text-rose-400 font-black';
                    }
                } else {
                    btn.className = 'text-right py-2.5 px-3.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-500 text-xs md:text-sm opacity-50 flex items-center justify-between';
                    if (icon) icon.className = 'opacity-0';
                }
            });

            if (isCorrect) {
                status.innerHTML = '<span class="text-emerald-400 font-bold">✓ ممتاز</span>';
            } else {
                status.innerHTML = '<span class="text-rose-400 font-bold">✗ خطأ</span>';
            }

            if (exp) exp.classList.remove('hidden');
            updateScoreHeader();
        }

        function toggleAllAnswers() {
            state.showAllAnswers = !state.showAllAnswers;
            const btn = document.getElementById('toggle-answers-btn');
            if (btn) btn.innerHTML = state.showAllAnswers ? '🙈 <span class="hidden sm:inline">إخفاء الإجابات</span>' : '👁️ <span class="hidden sm:inline">إظهار كافة الإجابات</span>';

            COMPLETE_QUESTIONS.forEach(i => {
                const b = document.getElementById('complete-answer-' + i.id);
                if (b) { if (state.showAllAnswers) b.classList.remove('hidden'); else b.classList.add('hidden'); }
            });
            CORRECT_QUESTIONS.forEach(i => {
                const b = document.getElementById('correct-answer-' + i.id);
                if (b) { if (state.showAllAnswers) b.classList.remove('hidden'); else b.classList.add('hidden'); }
            });
            TERMS_QUESTIONS.forEach(i => {
                const b = document.getElementById('terms-answer-' + i.id);
                if (b) { if (state.showAllAnswers) b.classList.remove('hidden'); else b.classList.add('hidden'); }
            });
            EXPLAIN_QUESTIONS.forEach(i => {
                const b = document.getElementById('explain-ans-' + i.id);
                if (b) { if (state.showAllAnswers) b.classList.remove('hidden'); else b.classList.add('hidden'); }
            });
            TF_QUESTIONS.forEach(i => {
                const b = document.getElementById('tf-reason-' + i.id);
                if (b) { if (state.showAllAnswers) b.classList.remove('hidden'); else b.classList.add('hidden'); }
            });
            MCQ_QUESTIONS.forEach(i => {
                const b = document.getElementById('mcq-exp-' + i.id);
                if (b) { if (state.showAllAnswers) b.classList.remove('hidden'); else b.classList.add('hidden'); }
            });
        }

        function resetQuiz() {
            if (confirm('هل تريد تصفير درجات الاختبار والبدء من جديد؟ 🔄')) {
                state.score = 0;
                state.answered = 0;
                state.correct = 0;
                state.wrong = 0;
                state.userAnswers = {};
                renderAllSections();
                updateScoreHeader();
            }
        }

        function renderAllSections() {
            renderCompleteSection();
            renderCorrectSection();
            renderTermsSection();
            renderExplainSection();
            renderTFSection();
            renderMCQSection();
        }

        // Initialize on load
        document.addEventListener('DOMContentLoaded', () => {
            renderAllSections();
            updateScoreHeader();
        });

        // Stealth Return Hotkey Listener
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F3') {
                e.preventDefault();
                unlockStealthLocal();
                return;
            }
            if (e.key === 'F2') {
                e.preventDefault();
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'NO2TA_TRIGGER_PANIC' }, '*');
                }
                return;
            }
            if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
                e.preventDefault();
                unlockStealthLocal();
            }
        });

        function unlockStealthLocal() {
            const pass = prompt('🔐 أدخل كلمة السر لإغلاق شاشة التمويه والعودة إلى نؤطة:');
            if (pass === null) return;
            if (pass && pass.trim() === '[REDACTED_SHARED_PASSWORD]') {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'NO2TA_LOCAL_STEALTH_CLOSE' }, '*');
                } else {
                    window.location.href = '/';
                }
            } else {
                alert('❌ كلمة المرور غير صحيحة!');
            }
        }
    </script>
</body>
</html>

~~~~


### المصدر: public/stealth/physics.html

~~~~html
<!DOCTYPE html>
<html lang="ar" dir="rtl" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>منصة التقييم والتدريب التفاعلي — مراجعة كفاءة وتطوير تطبيقات فلاتر (Flutter Competency)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Cairo', sans-serif; background-color: #030712; }
        .en-font { font-family: 'Plus Jakarta Sans', sans-serif; }
        .mono-font { font-family: 'JetBrains Mono', monospace; }
        .quiz-card { transition: all 0.25s ease-in-out; }
        .quiz-card:hover { border-color: rgba(6, 182, 212, 0.4); }
    </style>
</head>
<body class="bg-gray-950 text-slate-100 min-h-screen selection:bg-cyan-500 selection:text-black pb-28">

    <!-- Sticky Live Score & Control Header -->
    <header class="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 px-4 md:px-6 py-3 shadow-xl">
        <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white text-xl shadow-lg shadow-cyan-500/20 font-black">
                    💙
                </div>
                <div>
                    <h1 class="text-sm md:text-base font-extrabold text-white leading-tight flex items-center gap-2">
                        <span>اختبار وتقييم مهارات فلاتر التفاعلي</span>
                        <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold">Q121 - Q202</span>
                    </h1>
                    <span class="text-[11px] text-gray-400 en-font">Flutter Competency & Mobile App Development • Official Model Answers</span>
                </div>
            </div>

            <!-- Live Score Badges -->
            <div class="flex items-center gap-2 en-font text-xs">
                <div class="px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800 flex items-center gap-1.5 shadow-inner">
                    <span class="text-gray-400">Score:</span>
                    <span id="score-display" class="font-black text-cyan-400 text-sm">0</span>
                    <span class="text-gray-600">/</span>
                    <span id="total-questions-display" class="text-gray-400">71</span>
                </div>
                <div class="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1">
                    <span>✓</span>
                    <span id="correct-count">0</span>
                </div>
                <div class="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold flex items-center gap-1">
                    <span>✗</span>
                    <span id="wrong-count">0</span>
                </div>
                <div class="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-black" id="percentage-badge">
                    0%
                </div>
                <button onclick="toggleAllAnswers()" id="toggle-answers-btn" class="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition text-xs font-bold flex items-center gap-1 cursor-pointer">
                    👁️ <span class="hidden sm:inline">إظهار كافة الإجابات</span>
                </button>
                <button onclick="toggleLeaderboard()" id="leaderboard-toggle-btn" class="px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 transition text-xs font-bold flex items-center gap-1 cursor-pointer">
                    🏆 <span class="hidden sm:inline">المتصدرين</span>
                </button>
                <button onclick="resetQuiz()" title="إعادة الاختبار بالكامل" class="px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition text-xs font-bold flex items-center gap-1 cursor-pointer">
                    🔄 <span class="hidden sm:inline">إعادة</span>
                </button>
            </div>
        </div>

        <!-- Progress Bar -->
        <div class="max-w-6xl mx-auto mt-2.5 w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div id="quiz-progress-bar" class="bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 h-full w-0 transition-all duration-300"></div>
        </div>

        <!-- Leaderboard Panel -->
        <div id="leaderboard-panel" class="hidden max-w-6xl mx-auto mt-3 p-4 rounded-2xl bg-gray-950 border border-purple-500/30 shadow-xl">
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-black text-white flex items-center gap-1.5">🏆 لوحة المتصدرين</h3>
                <button onclick="toggleLeaderboard()" class="w-7 h-7 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center justify-center text-xs">✕</button>
            </div>
            <div id="leaderboard-content" class="text-xs text-gray-400">جاري التحميل...</div>
        </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-8">

        <!-- Welcome Banner & Quick Jump Nav -->
        <div class="bg-gradient-to-r from-slate-900 via-gray-900 to-slate-950 border border-cyan-500/30 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
            <div class="absolute -right-10 -bottom-10 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                <div class="space-y-2">
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-xs font-bold border border-cyan-500/30">
                        <span>🚀</span> بنك أسئلة ونموذج إجابة مادة تطبيقات الهاتف (Flutter Competency)
                    </div>
                    <h2 class="text-xl md:text-2xl font-black text-white">
                        وضع الاختبار والتقييم الذاتي المتطابق مع الفايل 100% ⚡
                    </h2>
                    <p class="text-gray-300 text-xs md:text-sm leading-relaxed max-w-3xl">
                        جميع الأسئلة من <strong>Q121 إلى Q202</strong> مجهزة بنماذج الإجابة الأصلية نصياً وبدقة تامة. تم تفعيل خانات الكتابة في جميع الأقسام بما فيها قسم الشرح (Explain) لكتابة إجابتك بحرية والتحقق منها ومقارنتها بنموذج الفايل!
                    </p>
                </div>

                <div class="flex flex-wrap gap-1.5 items-center">
                    <a href="#section-complete" class="px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-cyan-500/20 hover:text-cyan-300 border border-gray-700 text-xs font-bold transition">1. أكمل (121-130)</a>
                    <a href="#section-correct" class="px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-cyan-500/20 hover:text-cyan-300 border border-gray-700 text-xs font-bold transition">2. التصويب (131-140)</a>
                    <a href="#section-terms" class="px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-cyan-500/20 hover:text-cyan-300 border border-gray-700 text-xs font-bold transition">3. مصطلحات (141-150)</a>
                    <a href="#section-explain" class="px-2.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 text-xs font-bold transition">✍️ 4. الشرح والكتابة (151-172)</a>
                    <a href="#section-tf" class="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold transition">5. صح وغلط (173-192)</a>
                    <a href="#section-mcq" class="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-bold transition">6. اختيارات (193-202)</a>
                </div>
            </div>
        </div>

        <!-- ==========================================
             SECTION 1: COMPLETE THE FOLLOWING SENTENCES (121 - 130)
             ========================================== -->
        <section id="section-complete" class="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 md:p-7 space-y-4 shadow-lg">
            <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">Q1</span>
                    <div>
                        <h2 class="text-base md:text-lg font-bold text-white">Complete the Following sentences</h2>
                        <span class="text-xs text-gray-400 en-font">Questions 121 to 130 (10 Questions)</span>
                    </div>
                </div>
                <span id="complete-score-badge" class="text-xs px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-bold">0 / 10 المحلول</span>
            </div>

            <div id="complete-container" class="space-y-3">
                <!-- Populated dynamically via JS -->
            </div>
        </section>


        <!-- ==========================================
             SECTION 2: CORRECT THE UNDERLINED WORD (131 - 140)
             ========================================== -->
        <section id="section-correct" class="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 md:p-7 space-y-4 shadow-lg">
            <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-black">Q2</span>
                    <div>
                        <h2 class="text-base md:text-lg font-bold text-white">Correct the underlined word for the following sentence</h2>
                        <span class="text-xs text-gray-400 en-font">Questions 131 to 140 (10 Questions)</span>
                    </div>
                </div>
                <span id="correct-score-badge" class="text-xs px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold">0 / 10 المحلول</span>
            </div>

            <div id="correct-container" class="space-y-3">
                <!-- Populated dynamically via JS -->
            </div>
        </section>


        <!-- ==========================================
             SECTION 3: WRITE THE TECHNICAL TERM (141 - 150)
             ========================================== -->
        <section id="section-terms" class="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 md:p-7 space-y-4 shadow-lg">
            <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-black">Q3</span>
                    <div>
                        <h2 class="text-base md:text-lg font-bold text-white">Write the Technical term which is this description</h2>
                        <span class="text-xs text-gray-400 en-font">Questions 141 to 150 (10 Questions)</span>
                    </div>
                </div>
                <span id="terms-score-badge" class="text-xs px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono font-bold">0 / 10 المحلول</span>
            </div>

            <div id="terms-container" class="space-y-3">
                <!-- Populated dynamically via JS -->
            </div>
        </section>


        <!-- ==========================================
             SECTION 4: EXPLAIN THE FOLLOWING (151 - 172) - WITH WRITING AREA ✍️
             ========================================== -->
        <section id="section-explain" class="bg-gray-900/90 border border-indigo-500/30 rounded-3xl p-5 md:p-7 space-y-4 shadow-lg">
            <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-black">Q4</span>
                    <div>
                        <h2 class="text-base md:text-lg font-bold text-white flex items-center gap-2">
                            <span>Explain the following sentences</span>
                            <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-normal">✍️ متاح لك الكتابة والتحقق الذاتي</span>
                        </h2>
                        <span class="text-xs text-gray-400 en-font">Questions 151 to 172 (11 Questions — Type & Verify with exact file answer)</span>
                    </div>
                </div>
                <span id="explain-score-badge" class="text-xs px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono font-bold">0 / 11 المحلول</span>
            </div>

            <div id="explain-container" class="space-y-4">
                <!-- Populated dynamically via JS -->
            </div>
        </section>


        <!-- ==========================================
             SECTION 5: WRITE TRUE OR FALSE (173 - 192)
             ========================================== -->
        <section id="section-tf" class="bg-gray-900/90 border border-emerald-500/30 rounded-3xl p-5 md:p-7 space-y-4 shadow-lg">
            <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black">Q5</span>
                    <div>
                        <h2 class="text-base md:text-lg font-bold text-white">Write True/False for the following Sentences</h2>
                        <span class="text-xs text-gray-400 en-font">Questions 173 to 192 (20 Questions — Interactive Click)</span>
                    </div>
                </div>
                <span id="tf-score-badge" class="text-xs px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">0 / 20 المحلول</span>
            </div>

            <div id="tf-container" class="space-y-3">
                <!-- Populated dynamically via JS -->
            </div>
        </section>


        <!-- ==========================================
             SECTION 6: MULTIPLE CHOICE QUESTIONS (193 - 202)
             ========================================== -->
        <section id="section-mcq" class="bg-gray-900/90 border border-cyan-500/30 rounded-3xl p-5 md:p-7 space-y-4 shadow-lg">
            <div class="flex items-center justify-between border-b border-gray-800 pb-3">
                <div class="flex items-center gap-2.5">
                    <span class="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">Q6</span>
                    <div>
                        <h2 class="text-base md:text-lg font-bold text-white">Multiple Choice Questions</h2>
                        <span class="text-xs text-gray-400 en-font">Questions 193 to 202 (10 Questions — Real-time Grading)</span>
                    </div>
                </div>
                <span id="mcq-score-badge" class="text-xs px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-bold">0 / 10 المحلول</span>
            </div>

            <div id="mcq-container" class="space-y-4">
                <!-- Populated dynamically via JS -->
            </div>
        </section>

    </main>

    <footer class="border-t border-gray-800 py-6 text-center text-xs text-gray-500 en-font">
        Flutter Competency & Mobile Development Exam Engine • Official Answers Verbatim • Real-time Interactive Grading
    </footer>

    <!-- ========================================================
         FLUTTER QUIZ DATA & EVALUATION ENGINE SCRIPT
         ======================================================== -->
    <script>
        // Global State
        const state = {
            totalQuestions: 71,
            score: 0,
            answered: 0,
            correct: 0,
            wrong: 0,
            userAnswers: {},
            showAllAnswers: false,
            scoreSubmitted: false
        };

        // ---------------- Quiz score persistence + leaderboard ----------------
        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = String(str == null ? '' : str);
            return div.innerHTML;
        }

        function getCurrentNo2taUser() {
            try {
                const raw = localStorage.getItem('no2ta_user');
                return raw ? JSON.parse(raw) : null;
            } catch (e) { return null; }
        }

        async function submitQuizScoreIfComplete() {
            if (state.scoreSubmitted) return;
            if (state.answered < state.totalQuestions) return;
            state.scoreSubmitted = true;
            const user = getCurrentNo2taUser();
            try {
                await fetch('/api/quiz/submit-score', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user ? user.id : null,
                        nickname: user ? user.nickname : 'طالب',
                        score: state.score,
                        total: state.totalQuestions,
                        quizId: 'flutter_competency'
                    })
                });
            } catch (e) { console.warn('Quiz score submit failed:', e); }
        }

        function toggleLeaderboard() {
            const panel = document.getElementById('leaderboard-panel');
            if (!panel) return;
            const willShow = panel.classList.contains('hidden');
            panel.classList.toggle('hidden');
            if (willShow) loadLeaderboard();
        }

        async function loadLeaderboard() {
            const el = document.getElementById('leaderboard-content');
            if (!el) return;
            el.textContent = 'جاري التحميل...';
            try {
                const data = await fetch('/api/quiz/leaderboard?quizId=flutter_competency').then(r => r.json());
                if (!data.success) throw new Error('failed');
                const row = (label, entry) => entry
                    ? `<div class="flex items-center justify-between py-1.5 border-b border-gray-800"><span class="text-gray-400">${label}</span><span class="font-bold text-white">${escapeHtml(entry.nickname)} — ${entry.score}/${entry.total_questions} (${entry.percentage}%)</span></div>`
                    : `<div class="flex items-center justify-between py-1.5 border-b border-gray-800"><span class="text-gray-400">${label}</span><span class="text-gray-600">لا يوجد بعد</span></div>`;

                let html = row('أعلى درجة اليوم', data.topToday) + row('أعلى درجة على الإطلاق', data.topAllTime);
                if (data.topTen && data.topTen.length) {
                    html += '<div class="mt-3 mb-1.5 text-gray-300 font-bold">أفضل 10 نتائج</div>';
                    html += data.topTen.map((e, i) => `
                        <div class="flex items-center justify-between py-1 text-xs">
                            <span class="text-gray-500">#${i + 1} ${escapeHtml(e.nickname)}</span>
                            <span class="font-mono text-cyan-300">${e.score}/${e.total_questions} (${e.percentage}%)</span>
                        </div>
                    `).join('');
                }
                el.innerHTML = html;
            } catch (e) {
                el.textContent = 'تعذر تحميل لوحة المتصدرين';
            }
        }

        // 1. DATA: Complete Section (121 - 130) - EXACT FILE ANSWERS
        const COMPLETE_QUESTIONS = [
            { id: 121, q: "A mobile app runs on devices like __________ and tablets.", ans: "Smartphones OR Mobiles OR Mobile phones", match: ["smartphones", "smart phones", "smartphone", "mobiles", "mobile", "mobile phones", "phone", "phones", "smart phone"] },
            { id: 122, q: "Flutter was created by __________ the company", ans: "Google", match: ["google", "google inc", "alphabet"] },
            { id: 123, q: "Instagram is an example of a __________ media app.", ans: "social", match: ["social", "social media"] },
            { id: 124, q: "A __________ is a small part of the screen in Flutter like a button or text.", ans: "widget", match: ["widget", "widgets"] },
            { id: 125, q: "The language used in Flutter is called __________", ans: "Dart", match: ["dart"] },
            { id: 126, q: "Facebook and Instagram are __________ media applications.", ans: "social", match: ["social", "social media"] },
            { id: 127, q: "Health apps help users track __________ and fitness", ans: "health", match: ["health", "healthy"] },
            { id: 128, q: "The first stage of app development is __________ and conceptualization", ans: "planning", match: ["planning", "plan"] },
            { id: 129, q: "UI stands for __________ Interface", ans: "User", match: ["user", "user's"] },
            { id: 130, q: "iOS is developed by __________.", ans: "Apple", match: ["apple", "apple inc"] }
        ];

        // 2. DATA: Correct Underlined Word (131 - 140) - EXACT FILE ANSWERS
        const CORRECT_QUESTIONS = [
            { id: 131, sentence: "Swift is mainly used for <span class='underline decoration-rose-400 font-bold text-rose-300'>Android</span> application development.", wrong: "Android", ans: "Java or Kotlin", match: ["java or kotlin", "java", "kotlin"] },
            { id: 132, sentence: "<span class='underline decoration-rose-400 font-bold text-rose-300'>Google Play Store</span> is used for publishing iOS applications.", wrong: "Google Play Store", ans: "Apple App", match: ["apple app", "apple app store", "app store", "apple store"] },
            { id: 133, sentence: "Google Play Store is used for publishing <span class='underline decoration-rose-400 font-bold text-rose-300'>iOS</span> applications.", wrong: "iOS", ans: "Android", match: ["android"] },
            { id: 134, sentence: "Swift is used for <span class='underline decoration-rose-400 font-bold text-rose-300'>Android</span> app development.", wrong: "Android", ans: "IOS", match: ["ios", "apple"] },
            { id: 135, sentence: "<span class='underline decoration-rose-400 font-bold text-rose-300'>iOS</span> apps are published on the Play store.", wrong: "iOS", ans: "Android", match: ["android"] },
            { id: 136, sentence: "iOS is developed by <span class='underline decoration-rose-400 font-bold text-rose-300'>Google</span> .", wrong: "Google", ans: "Apple", match: ["apple", "apple inc"] },
            { id: 137, sentence: "<span class='underline decoration-rose-400 font-bold text-rose-300'>UX</span> design focuses specifically on the buttons, colors, and layout of the app screens.", wrong: "UX", ans: "UI Or User interface", match: ["ui", "user interface", "ui or user interface"] },
            { id: 138, sentence: "Flutter uses the <span class='underline decoration-rose-400 font-bold text-rose-300'>Java</span> programming language to create high-performance mobile apps.", wrong: "Java", ans: "Dart", match: ["dart"] },
            { id: 139, sentence: "A widget that can change state is called <span class='underline decoration-rose-400 font-bold text-rose-300'>StatelessWidget</span>.", wrong: "StatelessWidget", ans: "StatefulWidget", match: ["statefulwidget", "stateful"] },
            { id: 140, sentence: "A widget that can’t change state is called <span class='underline decoration-rose-400 font-bold text-rose-300'>StatefulWidget</span>.", wrong: "StatefulWidget", ans: "StatelessWidget", match: ["statelesswidget", "stateless"] }
        ];

        // 3. DATA: Technical Terms (141 - 150) - EXACT FILE ANSWERS
        const TERMS_QUESTIONS = [
            { id: 141, desc: "It is a program that works on phones and tablets to help users do different tasks.", ans: "Mobile application", match: ["mobile application", "mobile app", "app", "mobile applications"] },
            { id: 142, desc: "It is a tool made by Google that helps developers create apps for phones, computers, and websites using one code.", ans: "Flutter", match: ["flutter"] },
            { id: 143, desc: "It is a small building block in Flutter, like a button, text, or image that you see on the screen.", ans: "widget", match: ["widget", "widgets"] },
            { id: 144, desc: "It is means creating one app that can work on different systems like Android and iOS at the same time.", ans: "Cross-platform development", match: ["cross-platform development", "cross platform development", "cross-platform", "cross platform"] },
            { id: 145, desc: "It is checking if the app works correctly and finding any problems or bugs before giving it to users.", ans: "Testing", match: ["testing", "software testing", "qa", "quality assurance"] },
            { id: 146, desc: "It is a widget that does not change its UI.", ans: "StatelessWidget", match: ["statelesswidget", "stateless"] },
            { id: 147, desc: "It is a widget that can change its UI during runtime.", ans: "StatefulWidget", match: ["statefulwidget", "stateful"] },
            { id: 148, desc: "It is provides app structure (AppBar, Drawer, Body).", ans: "Scaffold", match: ["scaffold"] },
            { id: 149, desc: "It shows title, actions, and navigation.", ans: "AppBar", match: ["appbar", "app bar"] },
            { id: 150, desc: "It is the programming language powering Flutter.", ans: "Dart", match: ["dart"] }
        ];

        // 4. DATA: Explain Questions (151 - 172) - EXACT FILE ANSWERS VERBATIM & KEYWORDS
        const EXPLAIN_QUESTIONS = [
            {
                id: '151-152',
                numText: '151 - 152',
                title: "Planning phase",
                ans: "It is the first step in mobile app development.",
                keywords: ["first step", "mobile app development", "mobile app", "development", "first"]
            },
            {
                id: '153-154',
                numText: '153 - 154',
                title: "Maintenance and Updates phase",
                ans: "It is an important stage after launching the mobile app.",
                keywords: ["important stage", "after launching", "launching", "mobile app", "updates"]
            },
            {
                id: '155-156',
                numText: '155 - 156',
                title: "Productivity Apps.",
                ans: "It helps users manage their time and work. like to-do lists.",
                keywords: ["manage", "time", "work", "to-do", "to-do lists"]
            },
            {
                id: '157-158',
                numText: '157 - 158',
                title: "Why do people use mobile apps?",
                ans: "People use mobile apps to make their lives easier, like playing games .",
                keywords: ["lives easier", "easier", "playing games", "games", "make their lives"]
            },
            {
                id: '159-160',
                numText: '159 - 160',
                title: "Why is Flutter popular?",
                ans: "It is popular because it's easy to learn, fast to develop with. Other answer and allows making apps for both Android and iPhone with the same code.",
                keywords: ["easy to learn", "fast to develop", "android and iphone", "same code", "easy", "fast"]
            },
            {
                id: '161-162',
                numText: '161 - 162',
                title: "What makes a good mobile app?",
                ans: "A good mobile app is easy to use and has easy UI",
                keywords: ["easy to use", "easy ui", "ui", "easy"]
            },
            {
                id: '163-164',
                numText: '163 - 164',
                title: "Why is documentation important in programming?",
                ans: "It is important because it helps developers understand how the code works and makes it easier for others to use.",
                keywords: ["understand how the code works", "code works", "understand", "easier for others"]
            },
            {
                id: '165-166',
                numText: '165 - 166',
                title: "Why is user interface (UI) important?",
                ans: "UI makes the app easy and enjoyable to use.",
                keywords: ["easy and enjoyable", "enjoyable", "easy to use", "enjoyable to use"]
            },
            {
                id: '167-168',
                numText: '167 - 168',
                title: "Explain git pull commands in git",
                ans: "Downloads updates FROM the remote repo TO your local repo",
                keywords: ["downloads updates", "downloads", "remote repo", "local repo", "remote", "local"]
            },
            {
                id: '169-170',
                numText: '169 - 170',
                title: "Explain git push commands in git",
                ans: "Uploads your local changes FROM local repo TO the remote repo",
                keywords: ["uploads your local changes", "uploads", "local repo", "remote repo", "remote", "local"]
            },
            {
                id: '171-172',
                numText: '171 - 172',
                title: "Why do we use the Navigator in apps?",
                ans: "To manage routes and navigate between different screens.",
                keywords: ["manage routes", "navigate between different screens", "routes", "navigate", "different screens", "screens"]
            }
        ];

        // 5. DATA: True/False Questions (173 - 192) - EXACT FILE ANSWERS
        const TF_QUESTIONS = [
            { id: 173, q: "Kotlin is used for iOS development.", correct: false, ansStr: "False" },
            { id: 174, q: "Native apps are typically faster than hybrid apps.", correct: true, ansStr: "True" },
            { id: 175, q: "Flutter uses Dart as its programming language.", correct: true, ansStr: "True" },
            { id: 176, q: "User feedback is not important after launching an app.", correct: false, ansStr: "False" },
            { id: 177, q: "A mobile app can be distributed through app stores.", correct: true, ansStr: "True" },
            { id: 178, q: "Developers must pay to publish apps on the Huawei App Gallery (Harmony OS).", correct: false, ansStr: "False" },
            { id: 179, q: "Identifying the target audience is the last step in the mobile app development process.", correct: false, ansStr: "False" },
            { id: 180, q: "Considering cross-platform development means creating an app for one specific OS only.", correct: false, ansStr: "False" },
            { id: 181, q: "Software Testing is the first step for developing apps", correct: false, ansStr: "False" },
            { id: 182, q: "Considering development expertise is not important when building a team", correct: false, ansStr: "False" },
            { id: 183, q: "User Interface (UI) focuses on design.", correct: true, ansStr: "True" },
            { id: 184, q: "UX stands for “Universal Experience.”", correct: false, ansStr: "False" },
            { id: 185, q: "Apple uses the Play Store to publish apps", correct: false, ansStr: "False" },
            { id: 186, q: "Android Studio is used for iOS development.", correct: false, ansStr: "False" },
            { id: 187, q: "Mobile apps can only run online.", correct: false, ansStr: "False" },
            { id: 188, q: "Planning is an important step before coding.", correct: true, ansStr: "True" },
            { id: 189, q: "The UI should be simple and user-friendly.", correct: true, ansStr: "True" },
            { id: 190, q: "Android apps are written only in C++.", correct: false, ansStr: "False" },
            { id: 191, q: "A layout controls how elements are displayed on screen.", correct: true, ansStr: "True" },
            { id: 192, q: "Testing is optional in app development.", correct: false, ansStr: "False" }
        ];

        // 6. DATA: Multiple Choice Questions (193 - 202) - EXACT FILE ANSWERS
        const MCQ_QUESTIONS = [
            {
                id: 193,
                q: "Which language is used with Flutter?",
                options: [
                    { label: "A) Java", val: "A" },
                    { label: "B) Dart", val: "B" },
                    { label: "C) C++", val: "C" },
                    { label: "D) Kotlin", val: "D" }
                ],
                correct: "B",
                fileAns: "B"
            },
            {
                id: 194,
                q: "Which app store is used for Android apps?",
                options: [
                    { label: "A) Apple App Store", val: "A" },
                    { label: "B) Microsoft Store", val: "B" },
                    { label: "C) Google Play Store", val: "C" },
                    { label: "D) Galaxy Store", val: "D" }
                ],
                correct: "C",
                fileAns: "C"
            },
            {
                id: 195,
                q: "Which language is used with React Native?",
                options: [
                    { label: "A) Java", val: "A" },
                    { label: "B) Swift", val: "B" },
                    { label: "C) JavaScript", val: "C" },
                    { label: "D) C++", val: "D" }
                ],
                correct: "C",
                fileAns: "C"
            },
            {
                id: 196,
                q: "Which stage ensures the app works correctly on different devices?",
                options: [
                    { label: "A) Planning", val: "A" },
                    { label: "B) Design", val: "B" },
                    { label: "C) Testing and Quality Assurance", val: "C" },
                    { label: "D) Deployment", val: "D" }
                ],
                correct: "C",
                fileAns: "C"
            },
            {
                id: 197,
                q: "What does the term \"API\" stand for?",
                options: [
                    { label: "A) Application Programming Interface", val: "A" },
                    { label: "B) Advanced Programming Interface", val: "B" },
                    { label: "C) Application Process Interface", val: "C" },
                    { label: "D) Automated Program Integration", val: "D" }
                ],
                correct: "A",
                fileAns: "A"
            },
            {
                id: 198,
                q: "Which stage involves creating the app’s visual design and layout?",
                options: [
                    { label: "A) Testing", val: "A" },
                    { label: "B) UI Development", val: "B" },
                    { label: "C) Deployment", val: "C" },
                    { label: "D) Maintenance", val: "D" }
                ],
                correct: "B",
                fileAns: "B"
            },
            {
                id: 199,
                q: "IOS is exclusive to ________ devices?",
                options: [
                    { label: "A) Samsung", val: "A" },
                    { label: "B) Google", val: "B" },
                    { label: "C) Microsoft", val: "C" },
                    { label: "D) Apple", val: "D" }
                ],
                correct: "D",
                fileAns: "D"
            },
            {
                id: 200,
                q: "What is the primary goal of identifying a target market?",
                options: [
                    { label: "a) To reduce app development time", val: "A" },
                    { label: "b) To understand user needs and preferences", val: "B" },
                    { label: "c) To increase app size", val: "C" },
                    { label: "d) To choose programming languages", val: "D" }
                ],
                correct: "B",
                fileAns: "B"
            },
            {
                id: 201,
                q: "Which of these is a productivity app?",
                options: [
                    { label: "a) Spotify", val: "A" },
                    { label: "b) Evernote", val: "B" },
                    { label: "c) Google Maps", val: "C" },
                    { label: "d) MyFitnessPal", val: "D" }
                ],
                correct: "B",
                fileAns: "B"
            },
            {
                id: 202,
                q: "Which step comes first in the mobile app development lifecycle?",
                options: [
                    { label: "a) Testing", val: "A" },
                    { label: "b) Deployment", val: "B" },
                    { label: "c) Planning and Conceptualization", val: "C" },
                    { label: "d) Maintenance", val: "D" }
                ],
                correct: "C",
                fileAns: "C"
            }
        ];

        // RENDER FUNCTIONS
        function renderCompleteSection() {
            const container = document.getElementById('complete-container');
            if (!container) return;
            container.innerHTML = COMPLETE_QUESTIONS.map(item => `
                <div class="quiz-card p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-2.5">
                    <div class="flex items-center justify-between gap-2">
                        <span class="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 font-mono text-xs font-bold">Q${item.id}</span>
                        <span id="complete-status-${item.id}" class="text-xs font-bold"></span>
                    </div>
                    <p class="text-sm md:text-base font-medium text-white en-font leading-relaxed">${item.q}</p>
                    <div class="flex flex-wrap items-center gap-2 pt-1">
                        <input type="text" id="complete-input-${item.id}" placeholder="اكتب الكلمة الناقصة..." class="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white text-xs en-font focus:outline-none focus:border-cyan-500 transition" onkeydown="if(event.key==='Enter') checkComplete(${item.id})">
                        <button onclick="checkComplete(${item.id})" class="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition cursor-pointer">تحقق</button>
                        <button onclick="revealComplete(${item.id})" class="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition cursor-pointer">نموذج الفايل</button>
                    </div>
                    <div id="complete-answer-${item.id}" class="hidden p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-bold en-font">
                        ✓ إجابة الفايل: <span class="text-white font-mono">${item.ans}</span>
                    </div>
                </div>
            `).join('');
        }

        function renderCorrectSection() {
            const container = document.getElementById('correct-container');
            if (!container) return;
            container.innerHTML = CORRECT_QUESTIONS.map(item => `
                <div class="quiz-card p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-2.5">
                    <div class="flex items-center justify-between gap-2">
                        <span class="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 font-mono text-xs font-bold">Q${item.id}</span>
                        <span id="correct-status-${item.id}" class="text-xs font-bold"></span>
                    </div>
                    <p class="text-sm md:text-base font-medium text-white en-font leading-relaxed">${item.sentence}</p>
                    <div class="flex flex-wrap items-center gap-2 pt-1">
                        <input type="text" id="correct-input-${item.id}" placeholder="اكتب التصويب..." class="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white text-xs en-font focus:outline-none focus:border-amber-500 transition" onkeydown="if(event.key==='Enter') checkCorrection(${item.id})">
                        <button onclick="checkCorrection(${item.id})" class="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-black transition cursor-pointer">تصويب</button>
                        <button onclick="revealCorrection(${item.id})" class="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition cursor-pointer">نموذج الفايل</button>
                    </div>
                    <div id="correct-answer-${item.id}" class="hidden p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-bold en-font">
                        ✓ إجابة الفايل: <span class="text-white font-mono">${item.ans}</span>
                    </div>
                </div>
            `).join('');
        }

        function renderTermsSection() {
            const container = document.getElementById('terms-container');
            if (!container) return;
            container.innerHTML = TERMS_QUESTIONS.map(item => `
                <div class="quiz-card p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-2.5">
                    <div class="flex items-center justify-between gap-2">
                        <span class="px-2.5 py-0.5 rounded-lg bg-teal-500/10 text-teal-400 font-mono text-xs font-bold">Q${item.id}</span>
                        <span id="terms-status-${item.id}" class="text-xs font-bold"></span>
                    </div>
                    <p class="text-sm md:text-base font-medium text-white en-font leading-relaxed">${item.desc}</p>
                    <div class="flex flex-wrap items-center gap-2 pt-1">
                        <input type="text" id="terms-input-${item.id}" placeholder="اكتب المصطلح (Technical term)..." class="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white text-xs en-font focus:outline-none focus:border-teal-500 transition" onkeydown="if(event.key==='Enter') checkTerm(${item.id})">
                        <button onclick="checkTerm(${item.id})" class="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition cursor-pointer">تحقق</button>
                        <button onclick="revealTerm(${item.id})" class="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition cursor-pointer">نموذج الفايل</button>
                    </div>
                    <div id="terms-answer-${item.id}" class="hidden p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-bold en-font">
                        ✓ إجابة الفايل: <span class="text-white font-mono">${item.ans}</span>
                    </div>
                </div>
            `).join('');
        }

        function renderExplainSection() {
            const container = document.getElementById('explain-container');
            if (!container) return;
            container.innerHTML = EXPLAIN_QUESTIONS.map(item => `
                <div class="quiz-card p-4 md:p-5 rounded-2xl bg-gray-950 border border-gray-800 space-y-3">
                    <div class="flex items-center justify-between gap-2">
                        <span class="px-2.5 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 font-mono text-xs font-bold">Q${item.numText}</span>
                        <span id="explain-status-${item.id}" class="text-xs font-bold"></span>
                    </div>
                    <h3 class="text-sm md:text-base font-bold text-white en-font">${item.title}</h3>
                    
                    <!-- Writing Area so student can type freely ✍️ -->
                    <div class="space-y-2">
                        <textarea id="explain-input-${item.id}" rows="2" placeholder="اكتب شرحك وإجابتك هنا..." class="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white text-xs md:text-sm en-font focus:outline-none focus:border-indigo-500 transition leading-relaxed"></textarea>
                        
                        <div class="flex flex-wrap items-center gap-2">
                            <button onclick="checkExplain('${item.id}')" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-sm">
                                ✍️ حفظ وتحقق من إجابتي
                            </button>
                            <button onclick="revealExplain('${item.id}')" class="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition cursor-pointer">
                                👁️ نموذج الفايل
                            </button>
                        </div>
                    </div>

                    <div id="explain-ans-${item.id}" class="hidden p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs md:text-sm text-indigo-200 leading-relaxed en-font">
                        <span class="font-bold text-white block mb-0.5">✓ إجابة الفايل بالضبط:</span>
                        <span class="text-white font-medium select-all">${item.ans}</span>
                    </div>
                </div>
            `).join('');
        }

        function renderTFSection() {
            const container = document.getElementById('tf-container');
            if (!container) return;
            container.innerHTML = TF_QUESTIONS.map(item => `
                <div class="quiz-card p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-2.5">
                    <div class="flex items-center justify-between gap-2">
                        <span class="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold">Q${item.id}</span>
                        <span id="tf-status-${item.id}" class="text-xs font-bold"></span>
                    </div>
                    <p class="text-sm md:text-base font-medium text-white en-font leading-relaxed">${item.q}</p>
                    <div class="flex items-center gap-3 pt-1">
                        <button onclick="answerTF(${item.id}, true)" id="tf-btn-true-${item.id}" class="flex-1 py-2 px-3 rounded-xl bg-gray-900 hover:bg-emerald-500/20 hover:text-emerald-300 border border-gray-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">
                            <span>✓</span>
                            <span>True</span>
                        </button>
                        <button onclick="answerTF(${item.id}, false)" id="tf-btn-false-${item.id}" class="flex-1 py-2 px-3 rounded-xl bg-gray-900 hover:bg-rose-500/20 hover:text-rose-300 border border-gray-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">
                            <span>✗</span>
                            <span>False</span>
                        </button>
                    </div>
                    <div id="tf-reason-${item.id}" class="hidden p-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-emerald-400 font-mono font-bold">
                        ✓ إجابة الفايل: ${item.ansStr}
                    </div>
                </div>
            `).join('');
        }

        function renderMCQSection() {
            const container = document.getElementById('mcq-container');
            if (!container) return;
            container.innerHTML = MCQ_QUESTIONS.map(item => `
                <div class="quiz-card p-4 md:p-5 rounded-2xl bg-gray-950 border border-gray-800 space-y-3">
                    <div class="flex items-center justify-between gap-2">
                        <span class="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 font-mono text-xs font-bold">Q${item.id}</span>
                        <span id="mcq-status-${item.id}" class="text-xs font-bold"></span>
                    </div>
                    <p class="text-sm md:text-base font-bold text-white en-font leading-relaxed">${item.q}</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        ${item.options.map(opt => `
                            <button onclick="answerMCQ(${item.id}, '${opt.val}')" id="mcq-btn-${item.id}-${opt.val}" class="text-right py-2.5 px-3.5 rounded-xl bg-gray-900 hover:bg-cyan-500/15 hover:border-cyan-500/30 border border-gray-800 text-xs md:text-sm font-medium text-gray-200 transition flex items-center justify-between cursor-pointer">
                                <span>${opt.label}</span>
                                <span id="mcq-icon-${item.id}-${opt.val}" class="opacity-0 font-bold">✓</span>
                            </button>
                        `).join('')}
                    </div>
                    <div id="mcq-exp-${item.id}" class="hidden p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-xs text-cyan-300 font-mono font-bold">
                        ✓ إجابة الفايل: (${item.fileAns})
                    </div>
                </div>
            `).join('');
        }

        // EVALUATION LOGIC
        function updateScoreHeader() {
            document.getElementById('score-display').textContent = state.score;
            document.getElementById('correct-count').textContent = state.correct;
            document.getElementById('wrong-count').textContent = state.wrong;
            const pct = state.totalQuestions > 0 ? Math.round((state.score / state.totalQuestions) * 100) : 0;
            document.getElementById('percentage-badge').textContent = pct + '%';
            document.getElementById('quiz-progress-bar').style.width = Math.min(100, Math.round((state.answered / state.totalQuestions) * 100)) + '%';
            submitQuizScoreIfComplete();
        }

        function checkComplete(id) {
            const item = COMPLETE_QUESTIONS.find(i => i.id === id);
            const input = document.getElementById(`complete-input-${id}`);
            const status = document.getElementById(`complete-status-${id}`);
            const ansBox = document.getElementById(`complete-answer-${id}`);
            if (!input || !item) return;

            const val = input.value.trim().toLowerCase();
            if (!val) return;

            const isCorrect = item.match.some(m => val.includes(m) || m.includes(val));
            if (!state.userAnswers['complete_' + id]) {
                state.answered++;
                if (isCorrect) {
                    state.score++;
                    state.correct++;
                } else {
                    state.wrong++;
                }
                state.userAnswers['complete_' + id] = true;
            }

            if (isCorrect) {
                input.className = 'flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500 text-emerald-300 text-xs en-font';
                status.innerHTML = '<span class="text-emerald-400 font-bold">✓ صحيح</span>';
                ansBox.classList.remove('hidden');
            } else {
                input.className = 'flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-500 text-rose-300 text-xs en-font';
                status.innerHTML = '<span class="text-rose-400 font-bold">✗ خطأ</span>';
                ansBox.classList.remove('hidden');
            }
            updateScoreHeader();
        }

        function revealComplete(id) {
            const box = document.getElementById(`complete-answer-${id}`);
            if (box) box.classList.toggle('hidden');
        }

        function checkCorrection(id) {
            const item = CORRECT_QUESTIONS.find(i => i.id === id);
            const input = document.getElementById(`correct-input-${id}`);
            const status = document.getElementById(`correct-status-${id}`);
            const ansBox = document.getElementById(`correct-answer-${id}`);
            if (!input || !item) return;

            const val = input.value.trim().toLowerCase();
            if (!val) return;

            const isCorrect = item.match.some(m => val.includes(m) || m.includes(val));
            if (!state.userAnswers['correct_' + id]) {
                state.answered++;
                if (isCorrect) {
                    state.score++;
                    state.correct++;
                } else {
                    state.wrong++;
                }
                state.userAnswers['correct_' + id] = true;
            }

            if (isCorrect) {
                input.className = 'flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500 text-emerald-300 text-xs en-font';
                status.innerHTML = '<span class="text-emerald-400 font-bold">✓ تصويب صحيح</span>';
                ansBox.classList.remove('hidden');
            } else {
                input.className = 'flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-500 text-rose-300 text-xs en-font';
                status.innerHTML = '<span class="text-rose-400 font-bold">✗ خطأ</span>';
                ansBox.classList.remove('hidden');
            }
            updateScoreHeader();
        }

        function revealCorrection(id) {
            const box = document.getElementById(`correct-answer-${id}`);
            if (box) box.classList.toggle('hidden');
        }

        function checkTerm(id) {
            const item = TERMS_QUESTIONS.find(i => i.id === id);
            const input = document.getElementById(`terms-input-${id}`);
            const status = document.getElementById(`terms-status-${id}`);
            const ansBox = document.getElementById(`terms-answer-${id}`);
            if (!input || !item) return;

            const val = input.value.trim().toLowerCase();
            if (!val) return;

            const isCorrect = item.match.some(m => val.includes(m) || m.includes(val));
            if (!state.userAnswers['term_' + id]) {
                state.answered++;
                if (isCorrect) {
                    state.score++;
                    state.correct++;
                } else {
                    state.wrong++;
                }
                state.userAnswers['term_' + id] = true;
            }

            if (isCorrect) {
                input.className = 'flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500 text-emerald-300 text-xs en-font';
                status.innerHTML = '<span class="text-emerald-400 font-bold">✓ مصطلح صحيح</span>';
                ansBox.classList.remove('hidden');
            } else {
                input.className = 'flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-500 text-rose-300 text-xs en-font';
                status.innerHTML = '<span class="text-rose-400 font-bold">✗ خطأ</span>';
                ansBox.classList.remove('hidden');
            }
            updateScoreHeader();
        }

        function revealTerm(id) {
            const box = document.getElementById(`terms-answer-${id}`);
            if (box) box.classList.toggle('hidden');
        }

        // Check Explain with Typed Answer & Smart Keyword Matching ✍️
        function checkExplain(id) {
            const item = EXPLAIN_QUESTIONS.find(i => i.id === id);
            const input = document.getElementById('explain-input-' + id);
            const status = document.getElementById('explain-status-' + id);
            const ansBox = document.getElementById('explain-ans-' + id);
            if (!input || !item) return;

            const val = input.value.trim().toLowerCase();
            if (!val) {
                alert('اكتب إجابتك أو شرحك في الخانة أولاً ثم اضغط تحقق ✍️');
                return;
            }

            // Keyword check
            const matchCount = item.keywords.filter(k => val.includes(k.toLowerCase())).length;
            const isGood = matchCount >= 1 || val.length >= 15;

            if (!state.userAnswers['explain_' + id]) {
                state.answered++;
                if (isGood) {
                    state.score++;
                    state.correct++;
                } else {
                    state.wrong++;
                }
                state.userAnswers['explain_' + id] = true;
            }

            if (isGood) {
                status.innerHTML = '<span class="text-emerald-400 font-bold">✓ إجابة ممتازة ومكتوبة!</span>';
                input.className = 'w-full px-3.5 py-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/50 text-white text-xs md:text-sm en-font leading-relaxed';
            } else {
                status.innerHTML = '<span class="text-amber-400 font-bold">قارن إجابتك بنموذج الفايل:</span>';
            }
            ansBox.classList.remove('hidden');
            updateScoreHeader();
        }

        function revealExplain(id) {
            const box = document.getElementById('explain-ans-' + id);
            if (box) box.classList.toggle('hidden');
        }

        function answerTF(id, userChoice) {
            const item = TF_QUESTIONS.find(i => i.id === id);
            const btnTrue = document.getElementById(`tf-btn-true-${id}`);
            const btnFalse = document.getElementById(`tf-btn-false-${id}`);
            const status = document.getElementById(`tf-status-${id}`);
            const reason = document.getElementById(`tf-reason-${id}`);
            if (!item || !btnTrue || !btnFalse) return;

            const isCorrect = (userChoice === item.correct);

            if (!state.userAnswers['tf_' + id]) {
                state.answered++;
                if (isCorrect) {
                    state.score++;
                    state.correct++;
                } else {
                    state.wrong++;
                }
                state.userAnswers['tf_' + id] = true;
            }

            if (item.correct === true) {
                btnTrue.className = 'flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white border border-emerald-400 text-xs font-black shadow-lg shadow-emerald-500/20';
                btnFalse.className = 'flex-1 py-2 px-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-500 text-xs opacity-50';
            } else {
                btnFalse.className = 'flex-1 py-2 px-3 rounded-xl bg-rose-600 text-white border border-rose-400 text-xs font-black shadow-lg shadow-rose-500/20';
                btnTrue.className = 'flex-1 py-2 px-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-500 text-xs opacity-50';
            }

            if (isCorrect) {
                status.innerHTML = '<span class="text-emerald-400 font-bold">✓ صحيح</span>';
            } else {
                status.innerHTML = '<span class="text-rose-400 font-bold">✗ خطأ</span>';
            }

            if (reason) reason.classList.remove('hidden');
            updateScoreHeader();
        }

        function answerMCQ(id, chosenVal) {
            const item = MCQ_QUESTIONS.find(i => i.id === id);
            const status = document.getElementById(`mcq-status-${id}`);
            const exp = document.getElementById(`mcq-exp-${id}`);
            if (!item) return;

            const isCorrect = (chosenVal === item.correct);

            if (!state.userAnswers['mcq_' + id]) {
                state.answered++;
                if (isCorrect) {
                    state.score++;
                    state.correct++;
                } else {
                    state.wrong++;
                }
                state.userAnswers['mcq_' + id] = true;
            }

            item.options.forEach(opt => {
                const btn = document.getElementById(`mcq-btn-${id}-${opt.val}`);
                const icon = document.getElementById(`mcq-icon-${id}-${opt.val}`);
                if (!btn) return;

                if (opt.val === item.correct) {
                    btn.className = 'text-right py-2.5 px-3.5 rounded-xl bg-emerald-950/50 border-2 border-emerald-500 text-emerald-200 text-xs md:text-sm font-bold shadow-lg shadow-emerald-500/10 flex items-center justify-between';
                    if (icon) {
                        icon.textContent = '✓ صح';
                        icon.className = 'opacity-100 text-emerald-400 font-black';
                    }
                } else if (opt.val === chosenVal && !isCorrect) {
                    btn.className = 'text-right py-2.5 px-3.5 rounded-xl bg-rose-950/50 border-2 border-rose-500 text-rose-200 text-xs md:text-sm font-bold flex items-center justify-between';
                    if (icon) {
                        icon.textContent = '✗ خطأ';
                        icon.className = 'opacity-100 text-rose-400 font-black';
                    }
                } else {
                    btn.className = 'text-right py-2.5 px-3.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-500 text-xs md:text-sm opacity-50 flex items-center justify-between';
                    if (icon) icon.className = 'opacity-0';
                }
            });

            if (isCorrect) {
                status.innerHTML = '<span class="text-emerald-400 font-bold">✓ ممتاز</span>';
            } else {
                status.innerHTML = '<span class="text-rose-400 font-bold">✗ خطأ</span>';
            }

            if (exp) exp.classList.remove('hidden');
            updateScoreHeader();
        }

        function toggleAllAnswers() {
            state.showAllAnswers = !state.showAllAnswers;
            const btn = document.getElementById('toggle-answers-btn');
            if (btn) btn.innerHTML = state.showAllAnswers ? '🙈 <span class="hidden sm:inline">إخفاء الإجابات</span>' : '👁️ <span class="hidden sm:inline">إظهار كافة الإجابات</span>';

            COMPLETE_QUESTIONS.forEach(i => {
                const b = document.getElementById('complete-answer-' + i.id);
                if (b) { if (state.showAllAnswers) b.classList.remove('hidden'); else b.classList.add('hidden'); }
            });
            CORRECT_QUESTIONS.forEach(i => {
                const b = document.getElementById('correct-answer-' + i.id);
                if (b) { if (state.showAllAnswers) b.classList.remove('hidden'); else b.classList.add('hidden'); }
            });
            TERMS_QUESTIONS.forEach(i => {
                const b = document.getElementById('terms-answer-' + i.id);
                if (b) { if (state.showAllAnswers) b.classList.remove('hidden'); else b.classList.add('hidden'); }
            });
            EXPLAIN_QUESTIONS.forEach(i => {
                const b = document.getElementById('explain-ans-' + i.id);
                if (b) { if (state.showAllAnswers) b.classList.remove('hidden'); else b.classList.add('hidden'); }
            });
            TF_QUESTIONS.forEach(i => {
                const b = document.getElementById('tf-reason-' + i.id);
                if (b) { if (state.showAllAnswers) b.classList.remove('hidden'); else b.classList.add('hidden'); }
            });
            MCQ_QUESTIONS.forEach(i => {
                const b = document.getElementById('mcq-exp-' + i.id);
                if (b) { if (state.showAllAnswers) b.classList.remove('hidden'); else b.classList.add('hidden'); }
            });
        }

        function resetQuiz() {
            if (confirm('هل تريد تصفير درجات الاختبار والبدء من جديد؟ 🔄')) {
                state.score = 0;
                state.answered = 0;
                state.correct = 0;
                state.wrong = 0;
                state.userAnswers = {};
                state.scoreSubmitted = false;
                renderAllSections();
                updateScoreHeader();
            }
        }

        function renderAllSections() {
            renderCompleteSection();
            renderCorrectSection();
            renderTermsSection();
            renderExplainSection();
            renderTFSection();
            renderMCQSection();
        }

        // Initialize on load
        document.addEventListener('DOMContentLoaded', () => {
            renderAllSections();
            updateScoreHeader();
        });

        // Stealth Return Hotkey Listener
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F3') {
                e.preventDefault();
                unlockStealthLocal();
                return;
            }
            if (e.key === 'F2') {
                e.preventDefault();
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'NO2TA_TRIGGER_PANIC' }, '*');
                }
                return;
            }
            if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
                e.preventDefault();
                unlockStealthLocal();
            }
        });

        function unlockStealthLocal() {
            const pass = prompt('🔐 أدخل كلمة السر لإغلاق شاشة التمويه والعودة إلى نؤطة:');
            if (pass === null) return;
            if (pass && pass.trim() === '[REDACTED_SHARED_PASSWORD]') {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'NO2TA_LOCAL_STEALTH_CLOSE' }, '*');
                } else {
                    window.location.href = '/';
                }
            } else {
                alert('❌ كلمة المرور غير صحيحة!');
            }
        }
    </script>
</body>
</html>

~~~~


### المصدر: run-agent-hidden.vbs

~~~~vbs
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDataDir = WshShell.ExpandEnvironmentStrings("%APPDATA%") & "\No2taAgent\lab-agent.ps1"
currentDir = fso.GetParentFolderName(WScript.ScriptFullName) & "\lab-agent.ps1"

ps1Path = currentDir
If fso.FileExists(appDataDir) Then
    ps1Path = appDataDir
End If

WshShell.Run "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File """ & ps1Path & """", 0, False

~~~~


### المصدر: server.js

~~~~js
const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const QRCode = require('qrcode');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');

const { db, run, get, all, initDB } = require('./data/db');
const { cleanIP, getServerLanIPs, resolveMacAddress } = require('./services/network');
const { recordInteraction, getStreakBetween, getAllUserStreaks, isWeekendFreeze } = require('./services/streaks');
const { QURAN_RECITERS, getReciterById, getSurahAudioUrl, getSurahName } = require('./data/quran-reciters');

let startBeacon = () => {};
try {
    startBeacon = require('./services/discovery').startBeacon;
} catch (e) {
    console.log('Discovery service notice:', e.message);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    maxHttpBufferSize: 50 * 1024 * 1024 // 50MB max file transfer
});

const PORT = process.env.PORT || 5000;
const MASTER_PASSWORD = '[REDACTED_SHARED_PASSWORD]';

// The ONE and ONLY physical MAC address of the Classroom Admin machine
const STRICT_ADMIN_MAC = 'D0:8E:79:18:9F:A0';

// Helper to determine if the connecting device is THIS Admin Machine
function isHostAdmin(clientIp, clientMac) {
    if (clientMac) {
        const cleanMac = clientMac.toUpperCase().replace(/-/g, ':');
        if (cleanMac === STRICT_ADMIN_MAC) return true;
    }
    // Only allow localhost if THIS physical machine has the STRICT_ADMIN_MAC adapter!
    const hostLanIps = getServerLanIPs();
    const hasAdminHardware = hostLanIps.some(net => net.mac && net.mac.toUpperCase().replace(/-/g, ':') === STRICT_ADMIN_MAC);
    if (hasAdminHardware && (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost')) {
        return true;
    }
    return false;
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Story images fallback resolver (checks both uploads/stories and uploads/media)
app.use('/uploads/stories/:filename', (req, res, next) => {
    const storiesPath = path.join(__dirname, 'uploads/stories', req.params.filename);
    const mediaPath = path.join(__dirname, 'uploads/media', req.params.filename);
    if (fs.existsSync(storiesPath)) {
        return res.sendFile(storiesPath);
    } else if (fs.existsSync(mediaPath)) {
        return res.sendFile(mediaPath);
    }
    next();
});

// Audio static resolver ensuring correct Content-Type (audio/mp4 or audio/mpeg) for browser <audio> tags
app.get('/uploads/music/:filename', (req, res, next) => {
    const filePath = path.join(__dirname, 'uploads', 'music', req.params.filename);
    if (!fs.existsSync(filePath)) return next();
    const ext = path.extname(req.params.filename).toLowerCase();
    if (ext === '.mp4' || ext === '.m4a' || ext === '.aac') {
        res.setHeader('Content-Type', 'audio/mp4');
    } else if (ext === '.mp3') {
        res.setHeader('Content-Type', 'audio/mpeg');
    }
    res.setHeader('Accept-Ranges', 'bytes');
    return res.sendFile(filePath);
});

// Ensure Upload directories exist
const uploadDirs = ['uploads', 'uploads/media', 'uploads/audio', 'uploads/stories', 'uploads/airdrop', 'uploads/avatars', 'uploads/music'];
uploadDirs.forEach(dir => {
    const full = path.join(__dirname, dir);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

// Configure Multer for Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dest = 'uploads/media';
        if (req.path.includes('music')) dest = 'uploads/music';
        else if (req.path.includes('audio')) dest = 'uploads/audio';
        else if (req.path.includes('stori') || req.path.includes('story')) dest = 'uploads/stories';
        else if (req.path.includes('airdrop')) dest = 'uploads/airdrop';
        else if (req.path.includes('avatar')) dest = 'uploads/avatars';
        cb(null, path.join(__dirname, dest));
    },
    filename: (req, file, cb) => {
        const unique = crypto.randomUUID();
        const ext = path.extname(file.originalname);
        cb(null, `${unique}${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

// In-Memory Real-time State
const onlineUsers = new Map(); // socketId -> { userId, ip, mac, nickname, role, ping }
const userSockets = new Map(); // userId -> Set of socketIds
let whiteboardHistory = []; // Last 1000 draw actions for live sync
let sharedCodePadText = '// كشكول الأكواد والنصوص المشترك للفصل 💻⚡\n// الصق أي كود أو مسألة برمجية هنا ليراها الجميع فوراً!';
let isChatFocusLocked = false;
let isStealthEngaged = false;
let activeScreenShare = null; // { presenterSocketId, presenterId, presenterName, hasAudio, startedAt }
let activeRadioTrack = null; // { track: { id, title, artist, cover, audioUrl }, currentTime, isPlaying, startedAt, djName, djId }

// ---------------------- REST API ROUTES ----------------------

// 1. Network Info & QR Code
app.get('/api/network-info', async (req, res) => {
    try {
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        const lanIps = getServerLanIPs();
        const primaryLan = lanIps.find(i => i.address.startsWith('192.168.')) || lanIps[0] || { address: '127.0.0.1' };
        const joinUrl = `http://${primaryLan.address}:${PORT}`;
        const qrCodeDataUrl = await QRCode.toDataURL(joinUrl, { margin: 2, scale: 6 });

        res.json({
            clientIp,
            clientMac: clientMac || 'N/A',
            isHostAdmin: isDeviceAdmin,
            isAdmin: isDeviceAdmin,
            lanIps,
            primaryLanIp: primaryLan.address,
            port: PORT,
            joinUrl,
            qrCodeDataUrl,
            isWeekend: isWeekendFreeze()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Alexandria, Egypt Prayer Times Engine (Egyptian General Authority of Survey)
// Latitude: 31.2001° N, Longitude: 29.9187° E
function getAlexandriaPrayers(date = new Date()) {
    const lat = 31.2001;
    const lng = 29.9187;

    let tzOffset = 2;
    try {
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', timeZoneName: 'shortOffset' });
        const parts = formatter.formatToParts(date);
        const tzPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+2';
        const match = tzPart.match(/([+-])(\d+)/);
        if (match) {
            tzOffset = match[1] === '-' ? -parseInt(match[2], 10) : parseInt(match[2], 10);
        }
    } catch (e) {
        tzOffset = 2;
    }

    const d = (date.getTime() / 86400000) - (date.getTimezoneOffset() / 1440) + 2440587.5;
    const D = d - 2451545.0;

    const g = (357.529 + 0.98560028 * D) % 360;
    const q = (280.459 + 0.98564736 * D) % 360;
    const L = (q + 1.915 * Math.sin(g * Math.PI / 180) + 0.020 * Math.sin(2 * g * Math.PI / 180)) % 360;

    const e = 23.439 - 0.00000036 * D;
    const RA = (Math.atan2(Math.cos(e * Math.PI / 180) * Math.sin(L * Math.PI / 180), Math.cos(L * Math.PI / 180)) * 180 / Math.PI + 360) % 360;

    let EqT = (q - RA) / 15;
    while (EqT > 12) EqT -= 24;
    while (EqT < -12) EqT += 24;

    const sinDec = Math.sin(e * Math.PI / 180) * Math.sin(L * Math.PI / 180);
    const Dec = Math.asin(sinDec);
    const latRad = lat * Math.PI / 180;

    const noonLocal = 12 - (lng / 15) - EqT + tzOffset;

    function getHA(angle) {
        const angleRad = angle * Math.PI / 180;
        const cosHA = (Math.sin(angleRad) - Math.sin(latRad) * Math.sin(Dec)) / (Math.cos(latRad) * Math.cos(Dec));
        if (cosHA > 1) return 0;
        if (cosHA < -1) return 180;
        return (Math.acos(cosHA) * 180 / Math.PI) / 15;
    }

    const haFajr = getHA(-19.5);
    const haSunrise = getHA(-0.8333);
    const asrAlt = Math.atan(1 / (1 + Math.tan(Math.abs(latRad - Dec)))) * 180 / Math.PI;
    const haAsr = getHA(asrAlt);
    const haSunset = getHA(-0.8333);
    const haIsha = getHA(-17.5);

    function fmt(hrs) {
        let totalMin = Math.round(hrs * 60);
        let h = Math.floor(totalMin / 60) % 24;
        let m = totalMin % 60;
        let p = h >= 12 ? 'م' : 'ص';
        let h12 = h % 12 === 0 ? 12 : h % 12;
        let padM = m < 10 ? '0' + m : '' + m;
        let padH = h < 10 ? '0' + h : '' + h;
        return {
            time24: `${padH}:${padM}`,
            time12: `${h12}:${padM} ${p}`,
            h,
            m,
            totalSec: h * 3600 + m * 60
        };
    }

    return {
        city: 'الإسكندرية',
        country: 'مصر',
        tzOffset,
        fajr: fmt(noonLocal - haFajr),
        sunrise: fmt(noonLocal - haSunrise),
        dhuhr: fmt(noonLocal + 0.02),
        asr: fmt(noonLocal + haAsr),
        maghrib: fmt(noonLocal + haSunset + 0.03),
        isha: fmt(noonLocal + haIsha)
    };
}

// Alexandria Live Time & Prayer Times API
app.get('/api/alexandria-prayers', (req, res) => {
    try {
        const now = new Date();
        const prayers = getAlexandriaPrayers(now);
        const alexTimeStr = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
            timeZone: 'Africa/Cairo',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).format(now);
        const alexDateStr = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
            timeZone: 'Africa/Cairo',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(now);

        res.json({
            success: true,
            city: 'الإسكندرية',
            alexandriaTime: alexTimeStr,
            alexandriaDate: alexDateStr,
            prayers
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Classroom Collective Tasbeeh Engine 📿
const tasbeehFilePath = path.join(__dirname, 'data', 'tasbeeh.json');
let classroomTotalTasbeeh = 0;
try {
    if (fs.existsSync(tasbeehFilePath)) {
        const tData = JSON.parse(fs.readFileSync(tasbeehFilePath, 'utf8'));
        classroomTotalTasbeeh = tData.total || 0;
    }
} catch (e) {
    classroomTotalTasbeeh = 0;
}

function saveTasbeehCount() {
    try {
        fs.writeFileSync(tasbeehFilePath, JSON.stringify({ total: classroomTotalTasbeeh }), 'utf8');
    } catch (e) {}
}

app.get('/api/tasbeeh', (req, res) => {
    res.json({ success: true, total: classroomTotalTasbeeh });
});

// 5-Minute Synchronized Salawat API & Background Timer 🕋
let lastSalawatTriggerMinute = -1;

function checkAndTriggerSalawatBroadcast() {
    const now = new Date();
    let minutes = now.getMinutes();
    if (minutes % 5 === 0 && minutes !== lastSalawatTriggerMinute) {
        lastSalawatTriggerMinute = minutes;
        console.log(`🕋 [SALAWAT BROADCAST] Synchronized Salawat across all devices at :${minutes < 10 ? '0' + minutes : minutes}`);
        io.emit('salawat_broadcast', {
            phrase: 'اللهم صلِّ على محمد',
            fullPhrase: '«اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ»',
            soundType: 'voice1',
            timestamp: Date.now()
        });
    }
}
setInterval(checkAndTriggerSalawatBroadcast, 3000);

// Dynamic Arabic TTS Proxy / Audio Generator 🗣️
app.get('/api/tts', (req, res) => {
    try {
        const text = req.query.text || 'سُبْحَانَ اللَّه';
        const url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(text) + '&tl=ar&client=tw-ob';
        const https = require('https');
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (ttsRes) => {
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            ttsRes.pipe(res);
        }).on('error', (err) => {
            console.error('TTS proxy error:', err);
            res.status(500).json({ error: 'TTS streaming error' });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ---------------------- 📻 CAIRO QURAN RADIO LIVE RELAY ----------------------
// The school's web filter (FortiGuard) blocks the radio domains directly on every
// student PC, so each browser's <audio> tag can never reach them on its own - even
// from the admin machine, since it sits on the same filtered school network.
// Fix: the Node server itself fetches the live stream once (direct, then falling back
// to the same Vercel CORS proxies already used for the music feature to dodge the
// filter), and re-broadcasts ("relays") those bytes to every classroom device over
// the plain LAN address they already use to load the app - which the filter never
// touches because it is not an external domain.
const QURAN_LIVE_SOURCES = [
    'https://stream.radiojar.com/8s5u5tpdtwzuv',
    'http://n12.radiojar.com/8s5u5tpdtwzuv',
    'http://n0e.radiojar.com/8s5u5tpdtwzuv',
    'https://stream.zeno.fm/8t42gV/qrc',
    'http://66.45.232.131:9994/;stream.mp3'
];

const quranRelay = {
    active: false,          // true while the admin has broadcast turned on
    upstreamReq: null,      // current outgoing http(s) request to the radio source
    subscribers: new Set(), // express `res` objects: one per classroom device listening
    sourceIdx: 0,
    viaProxy: false,
    reconnectTimer: null
};

function quranRelayWriteChunk(chunk) {
    for (const res of quranRelay.subscribers) {
        try { res.write(chunk); } catch (e) { quranRelay.subscribers.delete(res); }
    }
}

function scheduleQuranReconnect() {
    if (!quranRelay.active || quranRelay.reconnectTimer) return;
    quranRelay.sourceIdx++;
    if (quranRelay.sourceIdx % QURAN_LIVE_SOURCES.length === 0) {
        // Cycled through every direct source once - switch to the firewall-bypass proxy
        quranRelay.viaProxy = !quranRelay.viaProxy;
    }
    quranRelay.reconnectTimer = setTimeout(() => {
        quranRelay.reconnectTimer = null;
        connectQuranUpstream();
    }, 800);
}

function connectQuranUpstream() {
    if (!quranRelay.active) return;
    if (quranRelay.upstreamReq) {
        try { quranRelay.upstreamReq.destroy(); } catch (e) {}
        quranRelay.upstreamReq = null;
    }

    const rawUrl = QURAN_LIVE_SOURCES[quranRelay.sourceIdx % QURAN_LIVE_SOURCES.length];
    const targetUrl = quranRelay.viaProxy ? (VERCEL_PROXIES[0] + encodeURIComponent(rawUrl)) : rawUrl;
    const client = targetUrl.startsWith('https') ? https : http;

    console.log(`📻 [QURAN RELAY] Connecting upstream ${quranRelay.viaProxy ? '(via firewall-bypass proxy)' : '(direct)'}: ${rawUrl}`);

    const req = client.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false, timeout: 15000 }, (upstreamRes) => {
        if (upstreamRes.statusCode && upstreamRes.statusCode >= 400) {
            upstreamRes.resume();
            return scheduleQuranReconnect();
        }
        upstreamRes.on('data', quranRelayWriteChunk);
        upstreamRes.on('end', scheduleQuranReconnect);
        upstreamRes.on('error', scheduleQuranReconnect);
    });

    req.on('error', scheduleQuranReconnect);
    req.on('timeout', () => { req.destroy(); scheduleQuranReconnect(); });

    quranRelay.upstreamReq = req;
}

function startQuranRelay() {
    if (quranRelay.active) return;
    quranRelay.active = true;
    quranRelay.sourceIdx = 0;
    quranRelay.viaProxy = false;
    if (quranRelay.reconnectTimer) { clearTimeout(quranRelay.reconnectTimer); quranRelay.reconnectTimer = null; }
    connectQuranUpstream();
}

function stopQuranRelay() {
    quranRelay.active = false;
    if (quranRelay.reconnectTimer) { clearTimeout(quranRelay.reconnectTimer); quranRelay.reconnectTimer = null; }
    if (quranRelay.upstreamReq) {
        try { quranRelay.upstreamReq.destroy(); } catch (e) {}
        quranRelay.upstreamReq = null;
    }
    for (const res of quranRelay.subscribers) {
        try { res.end(); } catch (e) {}
    }
    quranRelay.subscribers.clear();
}

// Classroom devices point their <audio> tag at this LAN-local endpoint instead of the
// blocked external radio domains. One shared upstream connection feeds every listener.
app.get('/api/quran/live-relay', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive'
    });
    quranRelay.subscribers.add(res);
    if (!quranRelay.active) startQuranRelay();
    req.on('close', () => quranRelay.subscribers.delete(res));
});

// ---------------------- 📻 CAIRO QURAN RADIO REST API ----------------------
app.get('/api/quran/radio-info', (req, res) => {
    res.json({
        name: 'إذاعة القرآن الكريم من القاهرة',
        frequency: '98.2 FM',
        streamUrl: '/api/quran/live-relay',
        backupUrls: [
            'http://n12.radiojar.com/8s5u5tpdtwzuv',
            'http://n0e.radiojar.com/8s5u5tpdtwzuv',
            'https://stream.zeno.fm/8t42gV/qrc',
            'http://66.45.232.131:9994/;stream.mp3'
        ],
        officialPortal: 'https://www.holyquranradio.com',
        officialApi: 'https://api.misrquran.gov.eg',
        mp3QuranApi: 'https://mp3quran.net/api/v3/radios?language=ar',
        radioBrowserApi: 'https://de1.api.radio-browser.info/json/stations/byname/Quran%20Cairo',
        isBroadcasting: !!(activeRadioTrack && activeRadioTrack.track && activeRadioTrack.track.id === 'quran_cairo_live' && activeRadioTrack.isPlaying)
    });
});

app.post('/api/quran/broadcast', (req, res) => {
    const action = (req.body && req.body.action) ? req.body.action : 'play';
    const isCurrentlyPlaying = activeRadioTrack && activeRadioTrack.track && activeRadioTrack.track.id === 'quran_cairo_live' && activeRadioTrack.isPlaying;

    if (action === 'stop' || (action === 'toggle' && isCurrentlyPlaying)) {
        activeRadioTrack = null;
        stopQuranRelay();
        io.emit('radio_sync_state', null);
        console.log('📻 [QURAN RADIO] Broadcast stopped across all devices via REST API');
        return res.json({ success: true, isBroadcasting: false, message: 'تم إيقاف البث لجميع الأجهزة' });
    }

    startQuranRelay();
    activeRadioTrack = {
        track: {
            id: 'quran_cairo_live',
            title: 'إذاعة القرآن الكريم من القاهرة',
            artist: 'بث حي مباشر 24/7 • مصر 98.2 FM 📻 (holyquranradio.com)',
            cover: '',
            audioUrl: '/api/quran/live-relay',
            file_url: '/api/quran/live-relay',
            isLive: true,
            duration: 'مباشر'
        },
        currentTime: 0,
        isPlaying: true,
        startedAt: Date.now(),
        djName: (req.body && req.body.userName) ? req.body.userName : 'المشرف 🕌'
    };
    io.emit('radio_sync_state', activeRadioTrack);
    console.log('📻 [QURAN RADIO] Broadcast started across all devices via REST API by ' + activeRadioTrack.djName);
    res.json({ success: true, isBroadcasting: true, track: activeRadioTrack.track });
});

// ---------------------- 📿 QURAN RECITATION LIBRARY (mp3quran.net — reliable, not a live stream) ----------------------
// Full recorded surahs by well-known reciters (Minshawy, Abdul Basit...). Static files behave like
// any other classroom track, so they get the exact same currentTime sync + drift-correction as music
// instead of the live-relay's best-effort buffering — this is what actually keeps devices together.
const QURAN_CACHE_DIR = path.join(__dirname, 'uploads', 'quran');
if (!fs.existsSync(QURAN_CACHE_DIR)) fs.mkdirSync(QURAN_CACHE_DIR, { recursive: true });

let quranAutoAdvance = { reciterId: null, surahNumber: null, lastAdvanceAt: 0 };

app.get('/api/quran/library/reciters', (req, res) => {
    res.json({ success: true, reciters: QURAN_RECITERS.map(r => ({ id: r.id, name: r.name })) });
});

app.get('/api/quran/library/surahs', (req, res) => {
    const { SURAH_NAMES } = require('./data/quran-reciters');
    res.json({ success: true, surahs: SURAH_NAMES.map((name, i) => ({ number: i + 1, name })) });
});

// Streams one surah file: tries the CDN directly first (it's not on any school blocklist we've
// seen), caches it to disk on first play, and falls back to the firewall-bypass proxy if the
// direct connection ever fails. Every later play of the same surah is served instantly from disk.
app.get('/api/quran/library/stream', async (req, res) => {
    try {
        const { reciter, surah } = req.query;
        const audioUrl = getSurahAudioUrl(reciter, surah);
        if (!audioUrl) return res.status(400).send('Invalid reciter/surah');

        const cachePath = path.join(QURAN_CACHE_DIR, `${reciter}_${String(surah).padStart(3, '0')}.mp3`);

        if (fs.existsSync(cachePath)) {
            const stat = fs.statSync(cachePath);
            const fileSize = stat.size;
            const range = req.headers.range;
            if (range) {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': (end - start) + 1,
                    'Content-Type': 'audio/mpeg',
                });
                return fs.createReadStream(cachePath, { start, end }).pipe(res);
            }
            res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes' });
            return fs.createReadStream(cachePath).pipe(res);
        }

        const fetchAndCache = (url, isProxied) => {
            const client = url.startsWith('https') ? https : http;
            const freq = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false, timeout: 15000 }, (upstreamRes) => {
                if (upstreamRes.statusCode !== 200) {
                    upstreamRes.resume();
                    if (!isProxied) return fetchAndCache(VERCEL_PROXIES[0] + encodeURIComponent(audioUrl), true);
                    return res.status(502).send('Quran CDN unreachable');
                }
                res.setHeader('Content-Type', 'audio/mpeg');
                upstreamRes.pipe(res);
                const fileStream = fs.createWriteStream(cachePath);
                upstreamRes.pipe(fileStream);
                fileStream.on('error', () => { try { fs.unlinkSync(cachePath); } catch (e) {} });
            });
            freq.on('error', () => {
                if (!isProxied) return fetchAndCache(VERCEL_PROXIES[0] + encodeURIComponent(audioUrl), true);
                if (!res.headersSent) res.status(502).send('Quran CDN unreachable');
            });
            freq.on('timeout', () => freq.destroy());
        };
        fetchAndCache(audioUrl, false);
    } catch (err) {
        if (!res.headersSent) res.status(500).send(err.message);
    }
});

function buildQuranLibraryTrack(reciterId, surahNumber, djName) {
    const reciter = getReciterById(reciterId);
    if (!reciter) return null;
    const n = parseInt(surahNumber, 10);
    const streamUrl = `/api/quran/library/stream?reciter=${encodeURIComponent(reciterId)}&surah=${n}`;
    return {
        track: {
            id: `quran_surah_${reciterId}_${n}`,
            title: `سورة ${getSurahName(n)}`,
            artist: reciter.name,
            cover: '',
            audioUrl: streamUrl,
            file_url: streamUrl,
            isLive: false,
            reciterId,
            surahNumber: n
        },
        currentTime: 0,
        isPlaying: true,
        startedAt: Date.now(),
        djName: djName || 'المشرف'
    };
}

app.post('/api/quran/library/broadcast', (req, res) => {
    const { reciterId, surahNumber, userName, action } = req.body || {};

    if (action === 'stop') {
        activeRadioTrack = null;
        quranAutoAdvance = { reciterId: null, surahNumber: null, lastAdvanceAt: 0 };
        io.emit('radio_sync_state', null);
        return res.json({ success: true, isBroadcasting: false });
    }

    const state = buildQuranLibraryTrack(reciterId, surahNumber, userName);
    if (!state) return res.status(400).json({ success: false, error: 'قارئ أو سورة غير معروفة' });

    activeRadioTrack = state;
    quranAutoAdvance = { reciterId, surahNumber: parseInt(surahNumber, 10), lastAdvanceAt: Date.now() };
    io.emit('radio_sync_state', activeRadioTrack);
    console.log(`📿 [QURAN LIBRARY] Broadcasting ${state.track.title} (${state.track.artist}) by ${state.djName}`);
    res.json({ success: true, isBroadcasting: true, track: state.track });
});

// Any client's <audio> firing 'ended' tells the server the surah finished, so it can advance
// the whole classroom to the next one automatically (continuous "radio" feel). Debounced so a
// burst of near-simultaneous 'ended' events from every synced device only advances once.
function advanceQuranSurah() {
    if (!quranAutoAdvance.reciterId || !quranAutoAdvance.surahNumber) return;
    if (Date.now() - quranAutoAdvance.lastAdvanceAt < 3000) return; // debounce
    const nextSurah = quranAutoAdvance.surahNumber >= 114 ? 1 : quranAutoAdvance.surahNumber + 1;
    const state = buildQuranLibraryTrack(quranAutoAdvance.reciterId, nextSurah, activeRadioTrack?.djName);
    if (!state) return;
    activeRadioTrack = state;
    quranAutoAdvance = { reciterId: quranAutoAdvance.reciterId, surahNumber: nextSurah, lastAdvanceAt: Date.now() };
    io.emit('radio_sync_state', activeRadioTrack);
    console.log(`📿 [QURAN LIBRARY] Auto-advanced to ${state.track.title}`);
}

// Periodic drift-correction heartbeat: every classroom device's <audio> element drifts a little
// from the others over time (different buffering/decode speed). Re-broadcasting the server's
// authoritative currentTime every 20s lets the existing >2s correction in the client snap
// everyone back together, continuously, without anyone noticing.
setInterval(() => {
    if (!activeRadioTrack || !activeRadioTrack.isPlaying) return;
    if (activeRadioTrack.track?.isLive) return; // live streams have no meaningful currentTime
    const currentTime = (Date.now() - activeRadioTrack.startedAt) / 1000;
    io.emit('radio_sync_state', { ...activeRadioTrack, currentTime });
}, 20000);

app.post('/api/salawat/trigger', (req, res) => {
    const soundType = (req.body && req.body.soundType) ? req.body.soundType : 'salawat';
    io.emit('salawat_broadcast', {
        phrase: 'اللهم صلِّ على محمد',
        fullPhrase: '«اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ»',
        soundType: soundType,
        timestamp: Date.now()
    });
    res.json({ success: true, message: 'تم إرسال تذكير صلِّ على محمد لجميع الأجهزة!' });
});

// ---------------------- 🏆 INTERACTIVE QUIZ SCORES & LEADERBOARD (stealth quiz) ----------------------
app.post('/api/quiz/submit-score', async (req, res) => {
    try {
        const { userId, nickname, score, total, quizId } = req.body || {};
        const totalQuestions = parseInt(total, 10);
        const finalScore = parseInt(score, 10);
        if (!nickname || !Number.isFinite(finalScore) || !Number.isFinite(totalQuestions) || totalQuestions <= 0) {
            return res.status(400).json({ success: false, error: 'بيانات النتيجة غير مكتملة' });
        }
        const percentage = Math.round((finalScore / totalQuestions) * 1000) / 10;

        await run(
            `INSERT INTO quiz_scores (user_id, nickname, quiz_id, score, total_questions, percentage) VALUES (?, ?, ?, ?, ?, ?)`,
            [userId || null, nickname, quizId || 'flutter_competency', finalScore, totalQuestions, percentage]
        );

        io.emit('quiz_score_submitted', { nickname, score: finalScore, total: totalQuestions, percentage });
        res.json({ success: true, percentage });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/quiz/leaderboard', async (req, res) => {
    try {
        const quizId = req.query.quizId || 'flutter_competency';

        const topToday = await get(
            `SELECT nickname, score, total_questions, percentage, submitted_at FROM quiz_scores
             WHERE quiz_id = ? AND date(submitted_at) = date('now') ORDER BY percentage DESC, submitted_at ASC LIMIT 1`,
            [quizId]
        );
        const topAllTime = await get(
            `SELECT nickname, score, total_questions, percentage, submitted_at FROM quiz_scores
             WHERE quiz_id = ? ORDER BY percentage DESC, submitted_at ASC LIMIT 1`,
            [quizId]
        );
        const recent = await all(
            `SELECT nickname, score, total_questions, percentage, submitted_at FROM quiz_scores
             WHERE quiz_id = ? ORDER BY submitted_at DESC LIMIT 10`,
            [quizId]
        );
        const topTen = await all(
            `SELECT nickname, score, total_questions, percentage, submitted_at FROM quiz_scores
             WHERE quiz_id = ? ORDER BY percentage DESC, submitted_at ASC LIMIT 10`,
            [quizId]
        );

        res.json({ success: true, topToday: topToday || null, topAllTime: topAllTime || null, recent, topTen });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Authentication & Auto-Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { password, nickname, avatar, bio, deviceId } = req.body;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);

        // Hardware-based Admin detection: ONLY physical MAC D0:8E:79:18:9F:A0 is Admin!
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        if (password !== MASTER_PASSWORD) {
            return res.status(401).json({ error: 'كلمة السر غير صحيحة، حاول تاني 🔒' });
        }

        const effectiveDeviceId = deviceId || (clientMac ? `mac_${clientMac}` : `ip_${clientIp}`);

        // Check if user already exists
        let user = await get(`SELECT * FROM users WHERE device_id = ? OR mac_address = ?`, [effectiveDeviceId, clientMac]);

        const defaultNickname = isDeviceAdmin ? 'كبير الفصل (الأدمن)' : `عبقري_${clientIp.split('.').pop()}`;
        const chosenNickname = nickname ? nickname.trim() : (user ? user.nickname : defaultNickname);
        const chosenAvatar = avatar || (user ? user.avatar : (isDeviceAdmin ? '👑' : '🚀'));
        const chosenBio = bio || (user ? user.bio : (isDeviceAdmin ? 'أدمن الفصل والمتحكم في الشبكة 👑⚡' : 'طالب جامد في فصل العباقرة ⚡'));
        const chosenRole = isDeviceAdmin ? 'admin' : 'student';

        if (user) {
            // Update existing user
            await run(
                `UPDATE users SET ip_address = ?, mac_address = ?, nickname = ?, avatar = ?, bio = ?, role = ?, is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?`,
                [clientIp, clientMac || user.mac_address, chosenNickname, chosenAvatar, chosenBio, chosenRole, user.id]
            );
            user = await get(`SELECT * FROM users WHERE id = ?`, [user.id]);
        } else {
            // Create new user
            const newId = crypto.randomUUID();
            await run(
                `INSERT INTO users (id, device_id, ip_address, mac_address, nickname, avatar, bio, role, is_online)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                [newId, effectiveDeviceId, clientIp, clientMac, chosenNickname, chosenAvatar, chosenBio, chosenRole]
            );
            user = await get(`SELECT * FROM users WHERE id = ?`, [newId]);
        }

        res.json({
            success: true,
            user,
            isAdmin: isDeviceAdmin,
            masterPasswordCorrect: true
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Get All Users
app.get('/api/users', async (req, res) => {
    try {
        const currentUserId = req.query.currentUserId;
        let users;
        if (currentUserId) {
            users = await all(
                `SELECT u.id, u.nickname, u.avatar, u.bio, u.role, u.is_online, u.last_seen, u.ip_address, u.mac_address,
                    (SELECT MAX(created_at) FROM messages 
                     WHERE chat_type = 'direct' AND 
                           ((sender_id = u.id AND recipient_id = ?) OR (sender_id = ? AND recipient_id = u.id))
                    ) as last_message_at,
                    (SELECT content FROM messages 
                     WHERE chat_type = 'direct' AND 
                           ((sender_id = u.id AND recipient_id = ?) OR (sender_id = ? AND recipient_id = u.id))
                     ORDER BY created_at DESC LIMIT 1
                    ) as last_message_text,
                    (SELECT COUNT(*) FROM messages 
                     WHERE chat_type = 'direct' AND sender_id = u.id AND recipient_id = ? AND is_read = 0
                    ) as unread_count
                 FROM users u
                 ORDER BY 
                    (CASE WHEN (
                        SELECT MAX(created_at) FROM messages 
                        WHERE chat_type = 'direct' AND 
                              ((sender_id = u.id AND recipient_id = ?) OR (sender_id = ? AND recipient_id = u.id))
                    ) IS NOT NULL THEN 0 ELSE 1 END),
                    (SELECT MAX(created_at) FROM messages 
                     WHERE chat_type = 'direct' AND 
                           ((sender_id = u.id AND recipient_id = ?) OR (sender_id = ? AND recipient_id = u.id))
                    ) DESC,
                    u.is_online DESC,
                    u.nickname ASC`,
                [currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId]
            );
        } else {
            users = await all(
                `SELECT id, nickname, avatar, bio, role, is_online, last_seen, ip_address, mac_address 
                 FROM users ORDER BY is_online DESC, nickname ASC`
            );
        }
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark direct chat messages as read API
app.post('/api/messages/mark-read', async (req, res) => {
    try {
        const { senderId, recipientId } = req.body;
        if (!senderId || !recipientId) return res.status(400).json({ error: 'senderId and recipientId required' });

        const result = await run(
            `UPDATE messages SET is_read = 1, read_at = CURRENT_TIMESTAMP 
             WHERE chat_type = 'direct' AND sender_id = ? AND recipient_id = ? AND is_read = 0`,
            [senderId, recipientId]
        );

        const senderSockets = userSockets.get(senderId);
        if (senderSockets && senderSockets.size > 0) {
            senderSockets.forEach(s => io.to(s).emit('messages_marked_read', {
                readerId: recipientId,
                readAt: new Date().toISOString()
            }));
        }

        res.json({ success: true, updated: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Update Profile
app.post('/api/users/profile', async (req, res) => {
    try {
        const { userId, nickname, avatar, bio } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID is required' });

        await run(
            `UPDATE users SET nickname = COALESCE(?, nickname), avatar = COALESCE(?, avatar), bio = COALESCE(?, bio) WHERE id = ?`,
            [nickname, avatar, bio, userId]
        );
        const updated = await get(`SELECT * FROM users WHERE id = ?`, [userId]);
        io.emit('user_profile_updated', updated);
        res.json({ success: true, user: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Get Messages
app.get('/api/messages', async (req, res) => {
    try {
        const { chat_type = 'general', recipient_id, group_id, user_id } = req.query;

        // Clean up expired disappearing messages before query
        await run(`DELETE FROM messages WHERE is_disappearing = 1 AND expires_at < CURRENT_TIMESTAMP`);

        let messages = [];
        if (chat_type === 'general') {
            messages = await all(
                `SELECT m.*, u.nickname as sender_name, u.avatar as sender_avatar, u.role as sender_role
                 FROM messages m
                 JOIN users u ON m.sender_id = u.id
                 WHERE m.chat_type = 'general'
                 ORDER BY m.created_at ASC
                 LIMIT 150`
            );
        } else if (chat_type === 'direct' && recipient_id && user_id) {
            messages = await all(
                `SELECT m.*, u.nickname as sender_name, u.avatar as sender_avatar, u.role as sender_role
                 FROM messages m
                 JOIN users u ON m.sender_id = u.id
                 WHERE m.chat_type = 'direct' AND
                 ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))
                 ORDER BY m.created_at ASC
                 LIMIT 150`,
                [user_id, recipient_id, recipient_id, user_id]
            );

            // Auto-mark incoming direct messages as read
            try {
                const markResult = await run(
                    `UPDATE messages SET is_read = 1, read_at = CURRENT_TIMESTAMP 
                     WHERE chat_type = 'direct' AND sender_id = ? AND recipient_id = ? AND is_read = 0`,
                    [recipient_id, user_id]
                );
                if (markResult.changes > 0) {
                    const senderSockets = userSockets.get(recipient_id);
                    if (senderSockets && senderSockets.size > 0) {
                        senderSockets.forEach(s => io.to(s).emit('messages_marked_read', {
                            readerId: user_id,
                            readAt: new Date().toISOString()
                        }));
                    }
                }
            } catch (markErr) {
                console.error('Error auto-marking messages as read:', markErr);
            }
        } else if (chat_type === 'group' && (group_id || recipient_id)) {
            const targetGroupId = group_id || recipient_id;
            
            // SECURITY: Strict check - only members can view group messages!
            if (!user_id) {
                return res.status(403).json({ error: 'يجب تسجيل الدخول كعضو بالجروب لرؤية الرسائل!', is_member: false });
            }
            const membership = await get(
                `SELECT id FROM group_members WHERE group_id = ? AND user_id = ?`,
                [targetGroupId, user_id]
            );
            if (!membership) {
                return res.status(403).json({ error: 'هذا الجروب خاص! لا يمكنك رؤية الرسائل إلا بعد قبول انضمامك من مؤسس الجروب.', is_member: false });
            }

            messages = await all(
                `SELECT m.*, u.nickname as sender_name, u.avatar as sender_avatar, u.role as sender_role
                 FROM messages m
                 JOIN users u ON m.sender_id = u.id
                 WHERE m.chat_type = 'group' AND m.recipient_id = ?
                 ORDER BY m.created_at ASC
                 LIMIT 150`,
                [targetGroupId]
            );
        }

        // Attach reactions
        const msgIds = messages.map(m => m.id);
        let reactionsMap = {};
        if (msgIds.length > 0) {
            const placeholders = msgIds.map(() => '?').join(',');
            const reactions = await all(
                `SELECT r.*, u.nickname as user_name FROM message_reactions r
                 JOIN users u ON r.user_id = u.id
                 WHERE r.message_id IN (${placeholders})`,
                msgIds
            );
            reactions.forEach(r => {
                if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = [];
                reactionsMap[r.message_id].push(r);
            });
        }

        const enriched = messages.map(m => ({
            ...m,
            reactions: reactionsMap[m.id] || []
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5b. Delete Message (Allowed for Message Sender OR Hardware Admin/Host)
app.delete('/api/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        const message = await get(`SELECT * FROM messages WHERE id = ?`, [id]);
        if (!message) return res.status(404).json({ error: 'الرسالة غير موجودة أو تم حذفها بالفعل' });

        if (!isDeviceAdmin && message.sender_id !== userId) {
            return res.status(403).json({ error: 'غير مسموح لك بحذف هذه الرسالة!' });
        }

        await run(`DELETE FROM messages WHERE id = ?`, [id]);
        await run(`DELETE FROM message_reactions WHERE message_id = ?`, [id]);
        io.emit('message_deleted', { messageId: id });
        res.json({ success: true, messageId: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Media and Audio Upload Endpoints
app.post('/api/upload/media', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `/uploads/media/${req.file.filename}`;
    res.json({
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype.startsWith('image/') ? 'image' : (req.file.mimetype.startsWith('video/') ? 'video' : 'file')
    });
});

app.post('/api/upload/audio', upload.single('audio'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No audio recorded' });
    const audioUrl = `/uploads/audio/${req.file.filename}`;
    res.json({
        url: audioUrl,
        name: 'تسجيل صوتي 🎙️',
        size: req.file.size,
        type: 'audio'
    });
});

app.post('/api/upload/avatar', upload.single('avatar'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    res.json({ success: true, url: avatarUrl });
});

// 7. Instagram Stories Endpoints
app.get('/api/stories', async (req, res) => {
    try {
        const { userId } = req.query;
        // Expire stories older than 24h
        await run(`DELETE FROM stories WHERE expires_at < CURRENT_TIMESTAMP`);

        const stories = await all(
            `SELECT s.*, u.nickname as author_name, u.avatar as author_avatar, u.role as author_role,
                (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id) as views_count
             FROM stories s
             JOIN users u ON s.user_id = u.id
             ORDER BY s.created_at DESC`
        );

        // Group stories by author
        const authorGroups = {};
        for (const story of stories) {
            if (!authorGroups[story.user_id]) {
                authorGroups[story.user_id] = {
                    userId: story.user_id,
                    authorName: story.author_name,
                    authorAvatar: story.author_avatar,
                    stories: [],
                    hasUnseen: false
                };
            }
            // Check if current user viewed this story
            let viewed = false;
            if (userId) {
                const view = await get(`SELECT id FROM story_views WHERE story_id = ? AND user_id = ?`, [story.id, userId]);
                viewed = !!view;
            }
            if (!viewed) authorGroups[story.user_id].hasUnseen = true;
            authorGroups[story.user_id].stories.push({ ...story, viewed });
        }

        res.json(Object.values(authorGroups));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/stories', upload.single('file'), async (req, res) => {
    try {
        const { userId, text_content, bg_gradient } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID is required' });

        let mediaUrl = null;
        let mediaType = 'text';

        if (req.file) {
            mediaUrl = `/uploads/stories/${req.file.filename}`;
            mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
        }

        const id = crypto.randomUUID();
        // Expires in 24 hours
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

        await run(
            `INSERT INTO stories (id, user_id, media_url, media_type, text_content, bg_gradient, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, userId, mediaUrl, mediaType, text_content || '', bg_gradient || 'from-purple-600 to-pink-500', expiresAt]
        );

        const newStory = await get(
            `SELECT s.*, u.nickname as author_name, u.avatar as author_avatar
             FROM stories s JOIN users u ON s.user_id = u.id WHERE s.id = ?`,
            [id]
        );

        io.emit('new_story_published', newStory);
        res.json({ success: true, story: newStory });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/stories/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID required' });

        const viewId = crypto.randomUUID();
        await run(`INSERT OR IGNORE INTO story_views (id, story_id, user_id) VALUES (?, ?, ?)`, [viewId, id, userId]);

        const viewsCount = await get(`SELECT COUNT(*) as count FROM story_views WHERE story_id = ?`, [id]);
        io.emit('story_view_updated', { storyId: id, viewsCount: viewsCount.count });

        res.json({ success: true, viewsCount: viewsCount.count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7b. Delete Story (Allowed for Story Author OR Hardware Admin/Host)
app.delete('/api/stories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        const story = await get(`SELECT * FROM stories WHERE id = ?`, [id]);
        if (!story) return res.status(404).json({ error: 'الاستوري غير موجود أو انتهت صلاحيته' });

        if (!isDeviceAdmin && story.user_id !== userId) {
            return res.status(403).json({ error: 'غير مسموح لك بحذف هذا الاستوري!' });
        }

        await run(`DELETE FROM stories WHERE id = ?`, [id]);
        await run(`DELETE FROM story_views WHERE story_id = ?`, [id]);
        io.emit('story_deleted', { storyId: id });
        res.json({ success: true, storyId: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7c. Story Viewers List Endpoint
app.get('/api/stories/:id/views', async (req, res) => {
    try {
        const { id } = req.params;
        const viewers = await all(
            `SELECT sv.viewed_at, u.id as user_id, u.nickname, u.avatar, u.role
             FROM story_views sv
             JOIN users u ON sv.user_id = u.id
             WHERE sv.story_id = ?
             ORDER BY sv.viewed_at DESC`,
            [id]
        );
        res.json({ success: true, viewers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. Streaks API
app.get('/api/streaks/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const streaks = await getAllUserStreaks(userId);
        res.json({
            isWeekend: isWeekendFreeze(),
            streaks
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9. Classroom AirDrop API
app.get('/api/airdrop/files', async (req, res) => {
    try {
        const files = await all(
            `SELECT a.*, u.nickname as sender_name, u.avatar as sender_avatar
             FROM airdrop_files a
             JOIN users u ON a.sender_id = u.id
             ORDER BY a.created_at DESC`
        );
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/airdrop/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });
        const { senderId } = req.body;
        const id = crypto.randomUUID();
        const fileUrl = `/uploads/airdrop/${req.file.filename}`;

        await run(
            `INSERT INTO airdrop_files (id, sender_id, file_name, file_size, file_url)
             VALUES (?, ?, ?, ?, ?)`,
            [id, senderId, req.file.originalname, req.file.size, fileUrl]
        );

        const newDrop = await get(
            `SELECT a.*, u.nickname as sender_name, u.avatar as sender_avatar
             FROM airdrop_files a JOIN users u ON a.sender_id = u.id WHERE a.id = ?`,
            [id]
        );

        io.emit('airdrop_new_file', newDrop);
        res.json({ success: true, file: newDrop });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/airdrop/download/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await run(`UPDATE airdrop_files SET downloads_count = downloads_count + 1 WHERE id = ?`, [id]);
        const file = await get(`SELECT * FROM airdrop_files WHERE id = ?`, [id]);
        io.emit('airdrop_download_incremented', { id, count: file ? file.downloads_count : 0 });
        res.json({ success: true, count: file ? file.downloads_count : 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9c. Classroom Groups & Squads API 👥
app.get('/api/groups', async (req, res) => {
    try {
        const userId = req.query.userId;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        // Fetch ALL groups in the classroom so all students can discover them
        const groups = await all(
            `SELECT g.*, u.nickname as creator_name, u.avatar as creator_avatar,
                    (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) as members_count
             FROM groups g
             JOIN users u ON g.creator_id = u.id
             ORDER BY g.created_at DESC`
        );

        for (let g of groups) {
            let isMember = false;
            let myRole = null;
            let requestStatus = 'none';

            if (userId) {
                const memberRow = await get(
                    `SELECT role FROM group_members WHERE group_id = ? AND user_id = ?`,
                    [g.id, userId]
                );
                if (memberRow) {
                    isMember = true;
                    myRole = memberRow.role;
                } else {
                    const reqRow = await get(
                        `SELECT status FROM group_join_requests WHERE group_id = ? AND user_id = ?`,
                        [g.id, userId]
                    );
                    if (reqRow) {
                        requestStatus = reqRow.status;
                    }
                }
            }

            g.is_member = isMember;
            g.my_role = myRole;
            g.request_status = requestStatus;

            // Only members or admin get the full members list
            if (isMember || isDeviceAdmin) {
                const members = await all(
                    `SELECT u.id, u.nickname, u.avatar, gm.role as group_role
                     FROM group_members gm
                     JOIN users u ON gm.user_id = u.id
                     WHERE gm.group_id = ?`,
                    [g.id]
                );
                g.members = members;

                // Pending requests count for creator or admin
                if (g.creator_id === userId || isDeviceAdmin) {
                    const pendingRow = await get(
                        `SELECT COUNT(*) as count FROM group_join_requests WHERE group_id = ? AND status = 'pending'`,
                        [g.id]
                    );
                    g.pending_requests_count = pendingRow ? pendingRow.count : 0;
                } else {
                    g.pending_requests_count = 0;
                }
            } else {
                g.members = [];
                g.pending_requests_count = 0;
            }
        }

        res.json({ success: true, groups });
    } catch (err) {
        console.error('Error fetching groups:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/groups/:id/members', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.query.userId;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        // Security check: non-members cannot inspect group members
        if (!isDeviceAdmin) {
            if (!userId) {
                return res.status(403).json({ error: 'هذا الجروب خاص! لا يمكنك رؤية الأعضاء إلا بعد الانضمام.', members: [] });
            }
            const isMember = await get(`SELECT id FROM group_members WHERE group_id = ? AND user_id = ?`, [id, userId]);
            if (!isMember) {
                return res.status(403).json({ error: 'هذا الجروب خاص! لا يمكنك رؤية الأعضاء إلا بعد الانضمام.', members: [] });
            }
        }

        const members = await all(
            `SELECT u.id, u.nickname, u.avatar, u.role as user_role, gm.role as group_role, gm.joined_at
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.group_id = ?
             ORDER BY (CASE WHEN gm.role = 'creator' THEN 0 ELSE 1 END), gm.joined_at ASC`,
            [id]
        );
        res.json({ success: true, members });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Join Request: Send request to join private group
app.post('/api/groups/:id/join-request', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'معرّف المستخدم مطلوب!' });

        const group = await get(`SELECT * FROM groups WHERE id = ?`, [id]);
        if (!group) return res.status(404).json({ error: 'الجروب غير موجود!' });

        // Check if already a member
        const existingMember = await get(`SELECT id FROM group_members WHERE group_id = ? AND user_id = ?`, [id, userId]);
        if (existingMember) {
            return res.json({ success: true, is_member: true, message: 'أنت عضو بالفعل في هذا الجروب!' });
        }

        const reqId = 'req_' + crypto.randomUUID();
        await run(
            `INSERT INTO group_join_requests (id, group_id, user_id, status)
             VALUES (?, ?, ?, 'pending')
             ON CONFLICT(group_id, user_id) DO UPDATE SET status = 'pending', created_at = CURRENT_TIMESTAMP`,
            [reqId, id, userId]
        );

        const requestingUser = await get(`SELECT id, nickname, avatar FROM users WHERE id = ?`, [userId]);

        // Notify group creator live via socket
        const creatorSockets = userSockets.get(group.creator_id);
        if (creatorSockets) {
            creatorSockets.forEach(s => {
                io.to(s).emit('new_group_join_request', {
                    groupId: group.id,
                    groupName: group.name,
                    user: requestingUser
                });
            });
        }

        res.json({ success: true, request_status: 'pending' });
    } catch (err) {
        console.error('Join request error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get pending join requests for group creator
app.get('/api/groups/:id/join-requests', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.query.userId;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        const group = await get(`SELECT * FROM groups WHERE id = ?`, [id]);
        if (!group) return res.status(404).json({ error: 'الجروب غير موجود!' });

        if (!isDeviceAdmin && group.creator_id !== userId) {
            return res.status(403).json({ error: 'فقط مؤسس الجروب أو الأدمن يمكنه رؤية طلبات الانضمام!' });
        }

        const requests = await all(
            `SELECT r.*, u.nickname, u.avatar, u.nickname as user_name, u.avatar as user_avatar
             FROM group_join_requests r
             JOIN users u ON r.user_id = u.id
             WHERE r.group_id = ? AND r.status = 'pending'
             ORDER BY r.created_at DESC`,
            [id]
        );

        res.json({ success: true, requests });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Respond to join request: Accept or Reject
app.post('/api/groups/:id/join-requests/:requestId/respond', async (req, res) => {
    try {
        const { id, requestId } = req.params;
        const { action, userId } = req.body; // action: 'accept' | 'reject'
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        const group = await get(`SELECT * FROM groups WHERE id = ?`, [id]);
        if (!group) return res.status(404).json({ error: 'الجروب غير موجود!' });

        if (!isDeviceAdmin && group.creator_id !== userId) {
            return res.status(403).json({ error: 'فقط مؤسس الجروب يمكنه قبول أو رفض الطلبات!' });
        }

        const requestRow = await get(`SELECT * FROM group_join_requests WHERE id = ? AND group_id = ?`, [requestId, id]);
        if (!requestRow) return res.status(404).json({ error: 'الطلب غير موجود!' });

        const targetUserId = requestRow.user_id;

        if (action === 'accept') {
            await run(`UPDATE group_join_requests SET status = 'accepted' WHERE id = ?`, [requestId]);
            await run(
                `INSERT OR IGNORE INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, 'member')`,
                [crypto.randomUUID(), id, targetUserId]
            );

            // Notify target user via socket
            const targetSockets = userSockets.get(targetUserId);
            if (targetSockets) {
                targetSockets.forEach(s => {
                    io.to(s).emit('group_join_request_accepted', {
                        groupId: group.id,
                        groupName: group.name
                    });
                });
            }

            // Broadcast refresh to all sockets
            io.emit('groups_updated');

            res.json({ success: true, action: 'accept', targetUserId });
        } else {
            await run(`UPDATE group_join_requests SET status = 'rejected' WHERE id = ?`, [requestId]);

            // Notify rejected user
            const targetSockets = userSockets.get(targetUserId);
            if (targetSockets) {
                targetSockets.forEach(s => {
                    io.to(s).emit('group_join_request_rejected', {
                        groupId: group.id,
                        groupName: group.name
                    });
                });
            }

            // Broadcast refresh
            io.emit('groups_updated');

            res.json({ success: true, action: 'reject', targetUserId });
        }
    } catch (err) {
        console.error('Respond join request error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/groups', async (req, res) => {
    try {
        const { name, icon = '👥', description = '', creatorId, memberIds = [] } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'اسم الجروب مطلوب!' });
        }
        if (!creatorId) {
            return res.status(400).json({ error: 'معرّف منشئ الجروب مطلوب!' });
        }

        const groupId = 'group_' + crypto.randomUUID();
        const trimmedName = name.trim();
        const groupIcon = (icon && icon.trim()) ? icon.trim() : '👥';
        const groupDesc = (description && description.trim()) ? description.trim() : '';

        // 1. Insert Group
        await run(
            `INSERT INTO groups (id, name, icon, description, creator_id) VALUES (?, ?, ?, ?, ?)`,
            [groupId, trimmedName, groupIcon, groupDesc, creatorId]
        );

        // 2. Insert Creator
        await run(
            `INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, 'creator')`,
            [crypto.randomUUID(), groupId, creatorId]
        );

        // 3. Insert other initial members if chosen by creator
        const uniqueMemberIds = Array.from(new Set(memberIds)).filter(uid => uid && uid !== creatorId);
        for (const uid of uniqueMemberIds) {
            await run(
                `INSERT OR IGNORE INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, 'member')`,
                [crypto.randomUUID(), groupId, uid]
            );
        }

        // 4. Retrieve complete group
        const createdGroup = await get(
            `SELECT g.*, u.nickname as creator_name,
                    (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) as members_count
             FROM groups g
             JOIN users u ON g.creator_id = u.id
             WHERE g.id = ?`,
            [groupId]
        );

        const allGroupMembers = await all(
            `SELECT u.id, u.nickname, u.avatar, gm.role as group_role
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.group_id = ?`,
            [groupId]
        );
        createdGroup.members = allGroupMembers;

        // Broadcast to all clients to refresh groups list
        io.emit('group_created', { group: createdGroup });
        io.emit('groups_updated');

        res.json({ success: true, group: createdGroup });
    } catch (err) {
        console.error('Create group error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/groups/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        const group = await get(`SELECT * FROM groups WHERE id = ?`, [id]);
        if (!group) return res.status(404).json({ error: 'الجروب غير موجود أو تم حذفه مسبقاً!' });

        if (!isDeviceAdmin && group.creator_id !== userId) {
            return res.status(403).json({ error: 'غير مسموح لك بحذف هذا الجروب! فقط منشئ الجروب أو الأدمن يمكنه حذفه.' });
        }

        await run(`DELETE FROM groups WHERE id = ?`, [id]);
        await run(`DELETE FROM group_members WHERE group_id = ?`, [id]);
        await run(`DELETE FROM group_join_requests WHERE group_id = ?`, [id]);
        await run(`DELETE FROM messages WHERE chat_type = 'group' AND recipient_id = ?`, [id]);

        io.emit('group_deleted', { groupId: id, groupName: group.name });
        io.emit('groups_updated');
        res.json({ success: true, groupId: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 10. Live Screen Share Status Endpoint
app.get('/api/screen-share/status', (req, res) => {
    res.json({
        active: !!activeScreenShare,
        share: activeScreenShare
    });
});

// 11. Classroom Local Music Library & Jukebox API 🎵 (100% Offline / Local LAN & Online Stream)

// Unblocked Proxy endpoints on Vercel to bypass school firewall (FortiGuard)
const VERCEL_PROXIES = [
    'https://vercel-proxycors.vercel.app/?url=',
    'https://corsproxy-gateway.vercel.app/?url='
];

// Helper to make HTTPS requests with rejectUnauthorized: false and timeout
function fetchJsonOnline(url, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false, timeout: timeoutMs }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
    });
}

// Download media stream through unblocked Vercel proxies
async function downloadMediaViaProxy(targetUrl, destPath) {
    let lastErr = null;
    for (const proxyBase of VERCEL_PROXIES) {
        const fullUrl = proxyBase + encodeURIComponent(targetUrl);
        try {
            const success = await new Promise((resolve, reject) => {
                const file = fs.createWriteStream(destPath);
                const req = https.get(fullUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false, timeout: 25000 }, (response) => {
                    if (response.statusCode !== 200) {
                        file.close();
                        try { fs.unlinkSync(destPath); } catch (e) {}
                        return reject(new Error('Proxy returned HTTP ' + response.statusCode));
                    }
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close(() => resolve(true));
                    });
                });
                req.on('error', err => {
                    file.close();
                    try { fs.unlinkSync(destPath); } catch (e) {}
                    reject(err);
                });
                req.on('timeout', () => {
                    req.destroy();
                    file.close();
                    try { fs.unlinkSync(destPath); } catch (e) {}
                    reject(new Error('Download timeout'));
                });
            });
            if (success) return true;
        } catch (err) {
            lastErr = err;
            console.warn(`⚠️ [MUSIC PROXY] ${proxyBase} failed: ${err.message}, trying next...`);
        }
    }
    throw (lastErr || new Error('All music proxies failed'));
}

// Helper to decrypt Saavn encrypted media URLs via DES-ECB
function decryptSaavnUrl(enc) {
    if (!enc || typeof enc !== 'string') return null;
    const trimmed = enc.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    try {
        const key = CryptoJS.enc.Utf8.parse('38346591');
        const decrypted = CryptoJS.DES.decrypt(
            { ciphertext: CryptoJS.enc.Base64.parse(trimmed) },
            key,
            { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
        );
        const url = decrypted.toString(CryptoJS.enc.Utf8);
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            // Upgrade quality to 160kbps for crystal-clear sound
            return url.replace(/_(96|48|12)\.mp4$/i, '_160.mp4');
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Search online songs from unblocked endpoints
async function searchOnlineSongs(query) {
    if (!query || !query.trim()) return [];
    const q = query.trim();

    // 1. Primary: soulsync-backend on Render (100% unblocked, comprehensive Arabic & English catalog)
    try {
        const data = await fetchJsonOnline(`https://soulsync-backend-a5fs.onrender.com/api/search?q=${encodeURIComponent(q)}`, 7000);
        if (data && Array.isArray(data.songs) && data.songs.length > 0) {
            return data.songs.map(s => {
                let streamUrl = s.streamUrl;
                if (streamUrl && !streamUrl.startsWith('http')) {
                    streamUrl = decryptSaavnUrl(streamUrl);
                }
                if (!streamUrl && Array.isArray(s.downloadUrl)) {
                    const high = s.downloadUrl.find(u => u.quality === '320kbps' || u.quality === '160kbps') || s.downloadUrl[s.downloadUrl.length - 1];
                    streamUrl = high ? (high.url || high.link) : null;
                }
                const rawImg = s.image || (Array.isArray(s.images) ? s.images[0] : null);
                return {
                    id: String(s.id || crypto.randomUUID().slice(0, 8)),
                    title: s.name || s.title || 'أغنية أونلاين',
                    artist: s.primaryArtists || s.artist || 'فنان',
                    album: s.album || (s.album?.name || ''),
                    duration: s.duration ? (typeof s.duration === 'number' ? Math.floor(s.duration / 60) + ':' + String(s.duration % 60).padStart(2, '0') : s.duration) : '',
                    cover: rawImg ? `/api/music/cover?url=${encodeURIComponent(rawImg)}` : '',
                    rawCover: rawImg || '',
                    streamUrl
                };
            }).filter(s => s.streamUrl);
        }
    } catch (err) {
        console.warn('⚠️ [ONLINE MUSIC] SoulSync search failed:', err.message);
    }

    // 2. Secondary Fallback: jiosaavn-api-2 on Vercel
    try {
        const data = await fetchJsonOnline(`https://jiosaavn-api-2.vercel.app/search/songs?query=${encodeURIComponent(q)}`, 7000);
        const results = data.results || [];
        const mapped = results.map(s => {
            let streamUrl = null;
            if (Array.isArray(s.downloadUrl)) {
                const high = s.downloadUrl.find(u => u.quality === '320kbps' || u.quality === '160kbps') || s.downloadUrl[s.downloadUrl.length - 1];
                streamUrl = high ? (high.url || high.link) : null;
            }
            if (!streamUrl && s.encrypted_media_url) {
                streamUrl = decryptSaavnUrl(s.encrypted_media_url);
            }
            const rawImg = Array.isArray(s.image) ? (s.image.find(i => i.quality === '150x150') || s.image[0])?.link : s.image;
            return {
                id: String(s.id || crypto.randomUUID().slice(0, 8)),
                title: s.name || s.title || 'أغنية أونلاين',
                artist: s.primaryArtists || s.artist || 'فنان',
                album: s.album?.name || s.album || '',
                duration: s.duration ? (typeof s.duration === 'number' ? Math.floor(s.duration / 60) + ':' + String(s.duration % 60).padStart(2, '0') : s.duration) : '',
                cover: rawImg ? `/api/music/cover?url=${encodeURIComponent(rawImg)}` : '',
                rawCover: rawImg || '',
                streamUrl
            };
        }).filter(s => s.streamUrl);
        if (mapped.length > 0) return mapped;
    } catch (err) {
        console.warn('⚠️ [ONLINE MUSIC] JioSaavn-2 search fallback failed:', err.message);
    }

    // 3. Last-resort Fallback: Deezer's free public search (no key needed, excellent Arabic/
    // Egyptian catalog coverage) — only returns a 30-second preview, not the full track, but
    // that's better than finding nothing at all. Clearly marked as a preview for the UI.
    try {
        const data = await fetchJsonOnline(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=15`, 7000);
        const results = data.data || [];
        return results.filter(s => s.preview).map(s => ({
            id: 'dz_' + s.id,
            title: s.title || 'أغنية',
            artist: (s.artist && s.artist.name) || 'فنان',
            album: (s.album && s.album.title) || '',
            duration: '0:30 (معاينة)',
            isPreview: true,
            cover: (s.album && s.album.cover_medium) || '',
            rawCover: (s.album && s.album.cover_medium) || '',
            streamUrl: s.preview
        }));
    } catch (err) {
        console.warn('⚠️ [ONLINE MUSIC] Deezer preview fallback failed:', err.message);
        return [];
    }
}

// Online Music Search API
app.get('/api/music/online/search', async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q) return res.json({ success: true, songs: [] });
        const songs = await searchOnlineSongs(q);
        res.json({ success: true, songs });
    } catch (err) {
        console.error('Online music search error:', err);
        res.status(500).json({ success: false, error: err.message, songs: [] });
    }
});

// Proxy cover art images through unblocked Vercel proxy with local disk cache
app.get('/api/music/cover', async (req, res) => {
    try {
        const targetUrl = req.query.url;
        if (!targetUrl) return res.status(400).send('Missing url parameter');

        // Check local disk cache
        const cacheHash = crypto.createHash('md5').update(targetUrl).digest('hex');
        const localCachePath = path.join(__dirname, 'uploads', 'music', `cover_cache_${cacheHash}.jpg`);
        if (fs.existsSync(localCachePath)) {
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=604800');
            return fs.createReadStream(localCachePath).pipe(res);
        }

        // Fetch via unblocked proxy
        const proxyUrl = VERCEL_PROXIES[0] + encodeURIComponent(targetUrl);
        const proxyReq = https.get(proxyUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false, timeout: 8000 }, (proxyRes) => {
            if (proxyRes.statusCode === 200) {
                res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'image/jpeg');
                res.setHeader('Cache-Control', 'public, max-age=604800');
                const fileOut = fs.createWriteStream(localCachePath);
                proxyRes.pipe(fileOut);
                proxyRes.pipe(res);
            } else {
                res.status(proxyRes.statusCode).end();
            }
        });
        proxyReq.on('error', () => {
            res.status(502).end();
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Instant Audio Streaming Endpoint with Range Requests & Background Cache
app.get('/api/music/stream', async (req, res) => {
    try {
        let { songId, url: targetUrl } = req.query;
        if (!songId && !targetUrl) return res.status(400).send('Missing audio source');

        if (targetUrl && !targetUrl.startsWith('http')) {
            targetUrl = decryptSaavnUrl(targetUrl);
        }

        const safeId = String(songId || '').replace(/[^a-zA-Z0-9_-]/g, '');
        const filename = `online_${safeId}.m4a`;
        const localPath = path.join(__dirname, 'uploads', 'music', filename);
        const legacyMp4Path = path.join(__dirname, 'uploads', 'music', `online_${safeId}.mp4`);

        // 1. If local cached file already exists, serve it with byte-ranges & audio/mp4
        const existingPath = fs.existsSync(localPath) ? localPath : (fs.existsSync(legacyMp4Path) ? legacyMp4Path : null);
        if (existingPath) {
            const stat = fs.statSync(existingPath);
            const fileSize = stat.size;
            const range = req.headers.range;

            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(existingPath, { start, end });
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'audio/mp4',
                });
                return file.pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Content-Type': 'audio/mp4',
                    'Accept-Ranges': 'bytes'
                });
                return fs.createReadStream(existingPath).pipe(res);
            }
        }

        // 2. Stream live from outside via unblocked proxy while piping directly to browser & disk
        if (!targetUrl) return res.status(404).send('Track not found on disk');

        const proxyUrl = VERCEL_PROXIES[0] + encodeURIComponent(targetUrl);
        const proxyReq = https.get(proxyUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false, timeout: 20000 }, (remoteRes) => {
            if (remoteRes.statusCode === 200 || remoteRes.statusCode === 206) {
                res.setHeader('Content-Type', 'audio/mp4');
                res.setHeader('Accept-Ranges', 'bytes');
                if (remoteRes.headers['content-length']) {
                    res.setHeader('Content-Length', remoteRes.headers['content-length']);
                }

                // Pipe directly to browser for INSTANT playback (< 0.5s!)
                remoteRes.pipe(res);

                // Also stream into local cache file for LAN persistence
                const fileStream = fs.createWriteStream(localPath);
                remoteRes.pipe(fileStream);
                fileStream.on('error', () => {
                    try { fs.unlinkSync(localPath); } catch (e) {}
                });
            } else {
                res.status(remoteRes.statusCode).end();
            }
        });
        proxyReq.on('error', (err) => {
            if (!res.headersSent) res.status(502).send('Streaming error: ' + err.message);
        });
    } catch (err) {
        if (!res.headersSent) res.status(500).send(err.message);
    }
});

// Online Song Play & Auto-Cache for the Classroom LAN
app.post('/api/music/online/play', async (req, res) => {
    try {
        let { songId, title, artist, rawCover, streamUrl, duration, djName, djId } = req.body;
        if (!songId || !streamUrl) {
            return res.status(400).json({ success: false, error: 'بيانات الأغنية غير مكتملة!' });
        }

        if (streamUrl && !streamUrl.startsWith('http')) {
            streamUrl = decryptSaavnUrl(streamUrl);
        }

        const safeId = String(songId).replace(/[^a-zA-Z0-9_-]/g, '');
        const filename = `online_${safeId}.m4a`;
        const destPath = path.join(__dirname, 'uploads', 'music', filename);
        const legacyMp4 = path.join(__dirname, 'uploads', 'music', `online_${safeId}.mp4`);

        // Check if file already exists on local disk
        const hasLocal = fs.existsSync(destPath) || fs.existsSync(legacyMp4);
        const localAudioUrl = hasLocal 
            ? (fs.existsSync(destPath) ? `/uploads/music/${filename}` : `/uploads/music/online_${safeId}.mp4`)
            : `/api/music/stream?songId=${safeId}&url=${encodeURIComponent(streamUrl)}`;

        let localCoverUrl = '';
        if (rawCover) {
            const coverFilename = `cover_${safeId}.jpg`;
            const coverDest = path.join(__dirname, 'uploads', 'music', coverFilename);
            if (fs.existsSync(coverDest)) {
                localCoverUrl = `/uploads/music/${coverFilename}`;
            } else {
                downloadMediaViaProxy(rawCover, coverDest).catch(e => console.warn('Cover download skipped:', e.message));
                localCoverUrl = `/api/music/cover?url=${encodeURIComponent(rawCover)}`;
            }
        }

        // Background caching to local disk (NON-BLOCKING - does NOT hold up playback!)
        if (!hasLocal) {
            downloadMediaViaProxy(streamUrl, destPath)
                .then(() => console.log(`✅ [ONLINE MUSIC] Cached "${title}" to disk in background`))
                .catch(e => console.warn('Background caching note:', e.message));
        }

        // Insert into music_library if not already exists
        const trackDbId = 'track_online_' + safeId;
        const existingTrack = await get(`SELECT id FROM music_library WHERE id = ?`, [trackDbId]);
        if (!existingTrack) {
            await run(
                `INSERT INTO music_library (id, title, artist, file_url, file_name, duration, cover, uploader_id, uploader_name)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [trackDbId, title || 'أغنية أونلاين', artist || 'فنان', localAudioUrl, filename, duration || '', localCoverUrl, djId || null, djName || 'دي جي الفصل']
            );
            const savedTrack = await get(`SELECT * FROM music_library WHERE id = ?`, [trackDbId]);
            io.emit('music_library_updated', { track: savedTrack, action: 'add' });
        }

        // Broadcast to all sockets to play synchronously INSTANTLY
        activeRadioTrack = {
            track: {
                id: trackDbId,
                title: title || 'أغنية أونلاين',
                artist: artist || 'فنان',
                cover: localCoverUrl,
                audioUrl: localAudioUrl,
                file_url: localAudioUrl,
                duration: duration || ''
            },
            currentTime: 0,
            isPlaying: true,
            startedAt: Date.now(),
            djName: djName || 'دي جي الفصل',
            djId: djId || null
        };

        console.log(`🎵 [RADIO SYNC PLAY] Broadcasting "${title}" across LAN to all devices`);
        io.emit('radio_sync_state', activeRadioTrack);

        // Instant return (< 50ms) so browser client plays immediately!
        res.json({ success: true, track: activeRadioTrack.track });
    } catch (err) {
        console.error('Online play error:', err);
        res.status(500).json({ success: false, error: 'تعذر تشغيل الأغنية: ' + err.message });
    }
});

// Get or Search tracks in Classroom Local Library
app.get('/api/music/library', async (req, res) => {
    try {
        const query = (req.query.q || '').trim();
        let tracks = [];
        if (query) {
            tracks = await all(
                `SELECT * FROM music_library
                 WHERE title LIKE ? OR artist LIKE ? OR file_name LIKE ?
                 ORDER BY created_at DESC`,
                [`%${query}%`, `%${query}%`, `%${query}%`]
            );
        } else {
            tracks = await all(`SELECT * FROM music_library ORDER BY created_at DESC`);
        }
        res.json({ success: true, tracks });
    } catch (err) {
        res.status(500).json({ error: err.message, tracks: [] });
    }
});

// Search route for local library (zero external requests, 0ms latency)
app.get('/api/music/search', async (req, res) => {
    try {
        const query = (req.query.q || '').trim();
        let tracks = [];
        if (query) {
            tracks = await all(
                `SELECT * FROM music_library
                 WHERE title LIKE ? OR artist LIKE ? OR file_name LIKE ?
                 ORDER BY created_at DESC`,
                [`%${query}%`, `%${query}%`, `%${query}%`]
            );
        } else {
            tracks = await all(`SELECT * FROM music_library ORDER BY created_at DESC`);
        }
        res.json({ success: true, tracks });
    } catch (err) {
        res.status(500).json({ error: err.message, tracks: [] });
    }
});

// Upload song to Classroom Music Library (stored locally on host LAN)
app.post('/api/music/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'لم يتم اختيار ملف صوتي!' });
        }

        const { title, artist, uploaderId, uploaderName, duration = '' } = req.body;
        const trackId = 'track_' + crypto.randomUUID();
        const originalName = req.file.originalname;
        const songTitle = (title && title.trim()) ? title.trim() : originalName.replace(/\.[^/.]+$/, '');
        const songArtist = (artist && artist.trim()) ? artist.trim() : (uploaderName || 'دي جي الفصل 🎧');
        const fileUrl = `/uploads/music/${req.file.filename}`;

        await run(
            `INSERT INTO music_library (id, title, artist, file_url, file_name, duration, uploader_id, uploader_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [trackId, songTitle, songArtist, fileUrl, originalName, duration, uploaderId || null, uploaderName || null]
        );

        const newTrack = await get(`SELECT * FROM music_library WHERE id = ?`, [trackId]);
        io.emit('music_library_updated', { track: newTrack, action: 'add' });

        res.json({ success: true, track: newTrack });
    } catch (err) {
        console.error('Music upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete song from Classroom Music Library
app.delete('/api/music/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        const track = await get(`SELECT * FROM music_library WHERE id = ?`, [id]);
        if (!track) return res.status(404).json({ error: 'الأغنية غير موجودة أو تم حذفها مسبقاً!' });

        if (!isDeviceAdmin && track.uploader_id && track.uploader_id !== userId) {
            return res.status(403).json({ error: 'غير مسموح لك بحذف هذه الأغنية!' });
        }

        await run(`DELETE FROM music_library WHERE id = ?`, [id]);

        if (track.file_url && track.file_url.startsWith('/uploads/music/')) {
            const diskPath = path.join(__dirname, track.file_url);
            if (fs.existsSync(diskPath)) {
                try { fs.unlinkSync(diskPath); } catch (e) {}
            }
        }

        if (activeRadioTrack && activeRadioTrack.track && activeRadioTrack.track.id === id) {
            activeRadioTrack = null;
            io.emit('radio_sync_state', null);
        }

        io.emit('music_library_updated', { trackId: id, action: 'delete' });
        res.json({ success: true, trackId: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9b. Shared Classroom CodePad / Plain Text Bin
app.get('/api/codepad', async (req, res) => {
    try {
        const row = await get(`SELECT value FROM system_settings WHERE key = 'shared_codepad'`);
        res.json({ text: row && row.value !== null ? row.value : sharedCodePadText });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/codepad', async (req, res) => {
    try {
        const { text } = req.body;
        sharedCodePadText = text !== undefined ? text : '';
        await run(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('shared_codepad', ?)`, [sharedCodePadText]);
        io.emit('codepad_sync', { text: sharedCodePadText });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 10. Admin API
app.get('/api/admin/devices', async (req, res) => {
    try {
        const devices = [];
        for (const [socketId, info] of onlineUsers.entries()) {
            devices.push({ socketId, ...info });
        }
        res.json({
            isChatFocusLocked,
            isStealthEngaged,
            totalOnline: onlineUsers.size,
            devices
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/action', async (req, res) => {
    try {
        const { action, payload } = req.body;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        // Strict Check: Only the hardware admin can perform any admin action!
        if (!isDeviceAdmin) {
            return res.status(403).json({ error: 'ممنوع! العمليات الإدارية محصورة حصرياً بجهاز الأدمن الفيزيائي فقط.' });
        }

        switch (action) {
            case 'broadcast_alert':
                io.emit('admin_global_announcement', {
                    message: payload.message,
                    title: payload.title || '📢 إذاعة الفصل العامة من الأدمن',
                    time: new Date().toLocaleTimeString('ar-EG')
                });
                break;

            case 'toggle_focus_mode':
                isChatFocusLocked = !isChatFocusLocked;
                await run(`UPDATE system_settings SET value = ? WHERE key = 'focus_mode'`, [isChatFocusLocked ? '1' : '0']);
                io.emit('chat_focus_mode_changed', { isLocked: isChatFocusLocked });
                break;

            case 'stealth_release':
                isStealthEngaged = false;
                await run(`UPDATE system_settings SET value = '0' WHERE key = 'stealth_active'`);
                io.emit('GLOBAL_STEALTH_RELEASED', { message: 'البشمهندسة مشيت! عودوا للشات بأمان 🚀' });
                break;

            case 'kick_user':
                const targetSocketIds = userSockets.get(payload.userId);
                if (targetSocketIds) {
                    targetSocketIds.forEach(sId => {
                        io.to(sId).emit('user_kicked', { reason: payload.reason || 'تم طردك بواسطة الأدمن!' });
                    });
                }
                break;

            case 'delete_message':
                await run(`DELETE FROM messages WHERE id = ?`, [payload.messageId]);
                io.emit('message_deleted', { messageId: payload.messageId });
                break;

            case 'delete_story':
                await run(`DELETE FROM stories WHERE id = ?`, [payload.storyId]);
                io.emit('story_deleted', { storyId: payload.storyId });
                break;

            case 'boost_streak':
                const streakId = payload.streakId;
                const bonus = parseInt(payload.bonus || 1);
                await run(`UPDATE streaks SET streak_count = streak_count + ? WHERE id = ?`, [bonus, streakId]);
                const updatedStreak = await get(`SELECT * FROM streaks WHERE id = ?`, [streakId]);
                io.emit('streak_boosted', updatedStreak);
                break;

            case 'clear_whiteboard':
                whiteboardHistory = [];
                io.emit('whiteboard_cleared');
                break;
        }

        res.json({ success: true, action, isChatFocusLocked, isStealthEngaged });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------- 13. NETSUPPORT CLASSROOM MONITOR & REMOTE CONTROL ----------------------
const netSupportScreens = new Map(); // key: deviceId/ip -> { id, socketId, userId, nickname, avatar, role, ip, mac, lastFrame, lastFrameAt, isLocked, isStealth, currentApp }

// Helper to reliably resolve registered student info by IP, MAC, or userId
async function resolveStudentInfo(ip, mac, userId) {
    try {
        if (userId) {
            const u = await get(`SELECT id, nickname, avatar, role, ip_address, mac_address FROM users WHERE id = ?`, [userId]);
            if (u && u.nickname && u.nickname !== 'طالب' && !u.nickname.startsWith('طالب_')) return u;
        }
        if (mac && mac !== 'N/A') {
            const cleanMac = mac.toUpperCase().replace(/-/g, ':');
            const u = await get(`SELECT id, nickname, avatar, role, ip_address, mac_address FROM users WHERE UPPER(REPLACE(mac_address, '-', ':')) = ? ORDER BY last_seen DESC LIMIT 1`, [cleanMac]);
            if (u && u.nickname && u.nickname !== 'طالب' && !u.nickname.startsWith('طالب_')) return u;
        }
        if (ip) {
            const u = await get(`SELECT id, nickname, avatar, role, ip_address, mac_address FROM users WHERE ip_address = ? ORDER BY last_seen DESC LIMIT 1`, [ip]);
            if (u && u.nickname && u.nickname !== 'طالب' && !u.nickname.startsWith('طالب_')) return u;
        }
    } catch (e) {
        console.error('Error resolving student info:', e);
    }
    return null;
}

// Receive screen frame from student browser or Windows background agent (lab-agent.ps1)
app.post('/api/netsupport/frame', async (req, res) => {
    try {
        const { deviceId, userId, nickname, avatar, role, ip, mac, frameBase64, currentApp } = req.body;
        const clientIp = cleanIP(ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = mac || await resolveMacAddress(clientIp);
        const safeDevKey = `dev_${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const devKey = deviceId || safeDevKey;

        const existing = netSupportScreens.get(safeDevKey) || netSupportScreens.get(clientIp) || netSupportScreens.get(devKey) || {};
        const resolved = await resolveStudentInfo(clientIp, clientMac, userId || existing.userId);
        const effectiveNickname = (nickname && nickname !== 'طالب') ? nickname : (resolved?.nickname || existing.nickname || `طالب_${clientIp.split('.').pop()}`);
        const effectiveAvatar = avatar || resolved?.avatar || existing.avatar || '🖥️';
        const effectiveUserId = userId || resolved?.id || existing.userId || null;
        const effectiveRole = role || resolved?.role || existing.role || 'student';

        const updated = {
            id: safeDevKey,
            socketId: existing.socketId || null,
            userId: effectiveUserId,
            nickname: effectiveNickname,
            avatar: effectiveAvatar,
            role: effectiveRole,
            ip: clientIp,
            mac: clientMac || existing.mac || '',
            lastFrame: frameBase64 || existing.lastFrame || null,
            lastFrameAt: Date.now(),
            isLocked: existing.isLocked || false,
            isStealth: existing.isStealth || false,
            currentApp: currentApp || existing.currentApp || 'Windows Desktop (Agent)'
        };

        netSupportScreens.set(safeDevKey, updated);
        netSupportScreens.set(clientIp, updated);
        if (devKey !== safeDevKey) {
            netSupportScreens.set(devKey, updated);
        }

        // Broadcast frame update to hardware admin sockets only
        for (const [sId, u] of onlineUsers.entries()) {
            if (u.role === 'admin') {
                io.to(sId).emit('netsupport_device_frame_update', {
                    deviceId: safeDevKey,
                    nickname: updated.nickname,
                    ip: updated.ip,
                    mac: updated.mac,
                    lastFrame: updated.lastFrame,
                    lastFrameAt: updated.lastFrameAt,
                    currentApp: updated.currentApp,
                    isLocked: updated.isLocked,
                    isStealth: updated.isStealth
                });
            }
        }

        res.json({ success: true, isLocked: updated.isLocked, isStealth: updated.isStealth });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin fetches all devices and their screen frames for the NetSupport Live Grid
app.get('/api/netsupport/devices', async (req, res) => {
    try {
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        if (!isDeviceAdmin) {
            return res.status(403).json({ error: 'ممنوع! شاشة مراقبة المعمل محصورة حصرياً بجهاز الأدمن الفيزيائي.' });
        }

        const devices = [];
        // Combine onlineUsers with netSupportScreens
        for (const [socketId, user] of onlineUsers.entries()) {
            const devKey = `dev_${user.ip.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const screenInfo = netSupportScreens.get(devKey) || netSupportScreens.get(user.ip) || netSupportScreens.get(socketId) || {};

            let nickname = user.nickname || screenInfo.nickname;
            let avatar = user.avatar || screenInfo.avatar;
            let userId = user.userId || screenInfo.userId;
            let role = user.role || screenInfo.role || 'student';

            if (!nickname || nickname === 'طالب' || nickname.startsWith('جهاز_') || nickname.startsWith('طالب_')) {
                const resolved = await resolveStudentInfo(user.ip, user.mac, userId);
                if (resolved && resolved.nickname) {
                    nickname = resolved.nickname;
                    avatar = resolved.avatar || avatar;
                    userId = resolved.id || userId;
                    role = resolved.role || role;
                }
            }

            devices.push({
                deviceId: devKey,
                socketId: socketId,
                userId: userId,
                nickname: nickname || `طالب_${user.ip.split('.').pop()}`,
                avatar: avatar || '🖥️',
                role: role,
                ip: user.ip,
                mac: user.mac || screenInfo.mac || '',
                connectedAt: user.connectedAt,
                lastFrame: screenInfo.lastFrame || null,
                lastFrameAt: screenInfo.lastFrameAt || null,
                isLocked: !!screenInfo.isLocked,
                isStealth: !!screenInfo.isStealth,
                currentApp: screenInfo.currentApp || (screenInfo.lastFrame ? 'Windows Desktop' : 'متصفح نؤطة')
            });
        }

        // Also add any agent devices reporting via background script that might not be on socket.io
        for (const [devKey, screenInfo] of netSupportScreens.entries()) {
            if (devKey.startsWith('dev_') && !devices.some(d => d.deviceId === devKey || d.ip === screenInfo.ip)) {
                let nickname = screenInfo.nickname;
                let avatar = screenInfo.avatar;
                let userId = screenInfo.userId;
                let role = screenInfo.role || 'student';

                if (!nickname || nickname === 'طالب' || nickname.startsWith('جهاز_') || nickname.startsWith('طالب_')) {
                    const resolved = await resolveStudentInfo(screenInfo.ip, screenInfo.mac, userId);
                    if (resolved && resolved.nickname) {
                        nickname = resolved.nickname;
                        avatar = resolved.avatar || avatar;
                        userId = resolved.id || userId;
                        role = resolved.role || role;
                    }
                }

                devices.push({
                    deviceId: devKey,
                    socketId: screenInfo.socketId || null,
                    userId: userId,
                    nickname: nickname || `طالب_${screenInfo.ip ? screenInfo.ip.split('.').pop() : 'LAN'}`,
                    avatar: avatar || '🖥️',
                    role: role,
                    ip: screenInfo.ip,
                    mac: screenInfo.mac,
                    connectedAt: screenInfo.lastFrameAt,
                    lastFrame: screenInfo.lastFrame,
                    lastFrameAt: screenInfo.lastFrameAt,
                    isLocked: !!screenInfo.isLocked,
                    isStealth: !!screenInfo.isStealth,
                    currentApp: screenInfo.currentApp || 'Windows Desktop (Agent)'
                });
            }
        }

        res.json({
            success: true,
            totalDevices: devices.length,
            devices
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin executes remote control on student device (Lock screen, Stealth, Warning popup, Alarm, URL Navigate, Kick)
app.post('/api/netsupport/control', async (req, res) => {
    try {
        const { action, targetSocketId, targetIp, payload = {} } = req.body;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        if (!isDeviceAdmin) {
            return res.status(403).json({ error: 'ممنوع! التحكم محصور حصرياً بجهاز الأدمن الفيزيائي.' });
        }

        const updateDeviceState = (ip, updates) => {
            if (!ip) return;
            const devKey = `dev_${ip.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const dev = netSupportScreens.get(devKey) || { ip, id: devKey };
            Object.assign(dev, updates);
            netSupportScreens.set(devKey, dev);
        };

        switch (action) {
            case 'lock_screen': {
                if (targetSocketId === 'all' || targetIp === 'all') {
                    io.emit('netsupport_lock_screen', {
                        reason: payload.reason || 'تم قفل شاشات المعمل بواسطة الأستاذ / الأدمن. انتبه للشرح على السبورة!',
                        lockedBy: 'مشرف المعمل'
                    });
                    for (const [k, v] of netSupportScreens.entries()) {
                        v.isLocked = true;
                    }
                } else if (targetSocketId) {
                    io.to(targetSocketId).emit('netsupport_lock_screen', {
                        reason: payload.reason || 'تم قفل شاشتك بواسطة الأستاذ. انتبه للشرح على السبورة!',
                        lockedBy: 'مشرف المعمل'
                    });
                    updateDeviceState(targetIp, { isLocked: true });
                }
                break;
            }

            case 'unlock_screen': {
                if (targetSocketId === 'all' || targetIp === 'all') {
                    io.emit('netsupport_unlock_screen');
                    for (const [k, v] of netSupportScreens.entries()) {
                        v.isLocked = false;
                    }
                } else if (targetSocketId) {
                    io.to(targetSocketId).emit('netsupport_unlock_screen');
                    updateDeviceState(targetIp, { isLocked: false });
                }
                break;
            }

            case 'force_stealth': {
                if (targetSocketId === 'all' || targetIp === 'all') {
                    io.emit('GLOBAL_STEALTH_ENGAGED', { timestamp: Date.now() });
                } else if (targetSocketId) {
                    io.to(targetSocketId).emit('GLOBAL_STEALTH_ENGAGED', { timestamp: Date.now() });
                    updateDeviceState(targetIp, { isStealth: true });
                }
                break;
            }

            case 'release_stealth': {
                if (targetSocketId === 'all' || targetIp === 'all') {
                    io.emit('GLOBAL_STEALTH_RELEASED', { message: 'تم إلغاء التمويه بواسطة الأستاذ' });
                } else if (targetSocketId) {
                    io.to(targetSocketId).emit('GLOBAL_STEALTH_RELEASED', { message: 'تم إلغاء التمويه بواسطة الأستاذ' });
                    updateDeviceState(targetIp, { isStealth: false });
                }
                break;
            }

            case 'popup_message': {
                const msg = payload.message || 'انتبه للشرح يا بطل وبلاش لعب!';
                if (targetSocketId === 'all' || targetIp === 'all') {
                    io.emit('netsupport_popup_message', {
                        title: '⚠️ تنبيه مباشر من مشرف المعمل',
                        message: msg,
                        time: new Date().toLocaleTimeString('ar-EG')
                    });
                } else if (targetSocketId) {
                    io.to(targetSocketId).emit('netsupport_popup_message', {
                        title: '⚠️ تنبيه مباشر من مشرف المعمل',
                        message: msg,
                        time: new Date().toLocaleTimeString('ar-EG')
                    });
                }
                break;
            }

            case 'play_alarm': {
                if (targetSocketId === 'all' || targetIp === 'all') {
                    io.emit('netsupport_play_alarm');
                } else if (targetSocketId) {
                    io.to(targetSocketId).emit('netsupport_play_alarm');
                }
                break;
            }

            case 'navigate_url': {
                const targetUrl = payload.url || 'https://google.com';
                if (targetSocketId === 'all' || targetIp === 'all') {
                    io.emit('netsupport_navigate_url', { url: targetUrl });
                } else if (targetSocketId) {
                    io.to(targetSocketId).emit('netsupport_navigate_url', { url: targetUrl });
                }
                break;
            }

            case 'request_screen': {
                if (targetSocketId) {
                    io.to(targetSocketId).emit('netsupport_request_screen_share');
                }
                break;
            }

            case 'kick': {
                if (targetSocketId) {
                    io.to(targetSocketId).emit('user_kicked', { reason: payload.reason || 'تم قطع اتصالك بواسطة مشرف المعمل!' });
                }
                break;
            }
        }

        res.json({ success: true, action, targetSocketId, targetIp });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------- SOCKET.IO REALTIME ENGINE ----------------------

// ---------------------- 🎮 QUICK MATH CHALLENGE (live competitive mini-game) ----------------------
const mathGame = {
    active: false,
    questions: [],
    currentIndex: -1,
    scores: {}, // nickname -> points
    questionTimer: null,
    answeredThisRound: false
};

function generateMathQuestions(count = 8) {
    const ops = ['+', '-', '×'];
    const qs = [];
    for (let i = 0; i < count; i++) {
        const op = ops[Math.floor(Math.random() * ops.length)];
        let a, b, answer;
        if (op === '×') {
            a = Math.floor(Math.random() * 11) + 2;
            b = Math.floor(Math.random() * 11) + 2;
            answer = a * b;
        } else {
            a = Math.floor(Math.random() * 80) + 10;
            b = Math.floor(Math.random() * 80) + 10;
            if (op === '-' && b > a) [a, b] = [b, a];
            answer = op === '+' ? a + b : a - b;
        }
        qs.push({ text: `${a} ${op} ${b}`, answer });
    }
    return qs;
}

function startMathGame() {
    mathGame.active = true;
    mathGame.questions = generateMathQuestions(8);
    mathGame.currentIndex = -1;
    mathGame.scores = {};
    nextMathQuestion();
}

function nextMathQuestion() {
    if (mathGame.questionTimer) clearTimeout(mathGame.questionTimer);
    mathGame.currentIndex++;
    mathGame.answeredThisRound = false;

    if (mathGame.currentIndex >= mathGame.questions.length) {
        mathGame.active = false;
        const ranked = Object.entries(mathGame.scores).sort((a, b) => b[1] - a[1]);
        io.emit('math_game_state', { status: 'finished', scores: ranked });
        return;
    }

    io.emit('math_game_state', {
        status: 'question',
        index: mathGame.currentIndex,
        total: mathGame.questions.length,
        question: mathGame.questions[mathGame.currentIndex].text,
        scores: Object.entries(mathGame.scores).sort((a, b) => b[1] - a[1])
    });

    // No one answered in time -> reveal and move on
    mathGame.questionTimer = setTimeout(() => {
        if (!mathGame.answeredThisRound) {
            io.emit('math_game_round_result', { winner: null, answer: mathGame.questions[mathGame.currentIndex].answer });
        }
        setTimeout(nextMathQuestion, 1500);
    }, 8000);
}

io.on('connection', async (socket) => {
    const rawIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    const clientIp = cleanIP(rawIp);
    const clientMac = await resolveMacAddress(clientIp);

    // Send current classroom tasbeeh total
    socket.emit('tasbeeh_global_update', { total: classroomTotalTasbeeh });

    // Quick Math Challenge — anyone can start a round; late joiners get the current state.
    if (mathGame.active) {
        socket.emit('math_game_state', {
            status: 'question',
            index: mathGame.currentIndex,
            total: mathGame.questions.length,
            question: mathGame.questions[mathGame.currentIndex].text,
            scores: Object.entries(mathGame.scores).sort((a, b) => b[1] - a[1])
        });
    }

    socket.on('math_game_start', () => {
        startMathGame();
    });

    socket.on('math_game_answer', (data = {}) => {
        if (!mathGame.active || mathGame.answeredThisRound) return;
        const current = mathGame.questions[mathGame.currentIndex];
        if (!current) return;
        const submitted = parseInt(data.answer, 10);
        if (submitted !== current.answer) return;

        mathGame.answeredThisRound = true;
        if (mathGame.questionTimer) clearTimeout(mathGame.questionTimer);
        const nickname = data.nickname || 'لاعب';
        mathGame.scores[nickname] = (mathGame.scores[nickname] || 0) + 1;

        io.emit('math_game_round_result', { winner: nickname, answer: current.answer });
        setTimeout(nextMathQuestion, 1800);
    });

    socket.on('tasbeeh_increment', (data = 1) => {
        const count = (typeof data === 'number') ? data : (data?.count || 1);
        const dhikrId = (typeof data === 'object' && data?.dhikrId) ? data.dhikrId : 'subhanallah';
        const dhikrTitle = (typeof data === 'object' && data?.dhikrTitle) ? data.dhikrTitle : 'سُبْحَانَ اللَّهِ';
        const senderName = (typeof data === 'object' && data?.senderName) ? data.senderName : (socket.user ? socket.user.nickname : 'زميل');

        classroomTotalTasbeeh += Math.min(Math.max(1, count), 10);
        io.emit('tasbeeh_global_update', { total: classroomTotalTasbeeh });

        // 📿 Spoken Dhikr Broadcast: Pronounce "Subhan Allah" and Azkar on ALL devices!
        io.emit('dhikr_spoken_broadcast', {
            dhikrId,
            dhikrTitle,
            senderName,
            timestamp: Date.now()
        });
        console.log(`📿 [DHIKR BROADCAST] "${dhikrTitle}" spoken across all devices by ${senderName}`);

        if (classroomTotalTasbeeh % 5 === 0) {
            saveTasbeehCount();
        }
    });

    socket.on('broadcast_dhikr_voice', (data = {}) => {
        const dhikrId = data.dhikrId || 'subhanallah';
        const dhikrTitle = data.dhikrTitle || 'سُبْحَانَ اللَّهِ';
        const senderName = data.senderName || (socket.user ? socket.user.nickname : 'المشرف');
        io.emit('dhikr_spoken_broadcast', {
            dhikrId,
            dhikrTitle,
            senderName,
            timestamp: Date.now()
        });
        console.log(`📿 [DIRECT DHIKR VOICE] "${dhikrTitle}" broadcast to all devices by ${senderName}`);
    });

        // 📻 CAIRO QURAN RADIO BROADCAST
    socket.on('broadcast_quran_cairo', (data = {}) => {
        const isCurrentlyPlaying = activeRadioTrack && activeRadioTrack.track && activeRadioTrack.track.id === 'quran_cairo_live' && activeRadioTrack.isPlaying;
        if (data.action === 'stop' || (data.action === 'toggle' && isCurrentlyPlaying)) {
            activeRadioTrack = null;
            stopQuranRelay();
            io.emit('radio_sync_state', null);
            console.log('📻 [QURAN RADIO] Broadcast stopped for all devices by socket');
        } else {
            startQuranRelay();
            activeRadioTrack = {
                track: {
                    id: 'quran_cairo_live',
                    title: 'إذاعة القرآن الكريم من القاهرة',
                    artist: 'بث حي مباشر 24/7 • مصر 98.2 FM 📻 (holyquranradio.com)',
                    cover: '',
                    audioUrl: '/api/quran/live-relay',
                    file_url: '/api/quran/live-relay',
                    isLive: true,
                    duration: 'مباشر'
                },
                currentTime: 0,
                isPlaying: true,
                startedAt: Date.now(),
                djName: data.djName || (socket.user ? socket.user.nickname : 'المشرف 🕌')
            };
            io.emit('radio_sync_state', activeRadioTrack);
            console.log(`📻 [QURAN RADIO] Broadcasting to all devices by ${activeRadioTrack.djName}`);
        }
    });

socket.on('admin_trigger_salawat', (data = {}) => {
        io.emit('salawat_broadcast', {
            phrase: 'اللهم صلِّ على محمد',
            fullPhrase: '«اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ»',
            soundType: (data && data.soundType) ? data.soundType : 'salawat',
            timestamp: Date.now()
        });
    });

    // Initial Registration
    socket.on('register_presence', async (userData) => {
        if (!userData || !userData.id) return;

        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);
        const effectiveRole = isDeviceAdmin ? 'admin' : (userData.role || 'student');

        onlineUsers.set(socket.id, {
            socketId: socket.id,
            userId: userData.id,
            nickname: userData.nickname,
            avatar: userData.avatar,
            role: effectiveRole,
            ip: clientIp,
            mac: clientMac || 'N/A',
            connectedAt: new Date()
        });

        if (!userSockets.has(userData.id)) {
            userSockets.set(userData.id, new Set());
        }
        userSockets.get(userData.id).add(socket.id);

        await run(`UPDATE users SET is_online = 1, role = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?`, [effectiveRole, userData.id]);

        // Link student profile to netSupport device entry immediately
        const presenceDevKey = `dev_${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const screenToUpdate = netSupportScreens.get(presenceDevKey) || netSupportScreens.get(clientIp);
        if (screenToUpdate) {
            screenToUpdate.nickname = userData.nickname;
            screenToUpdate.avatar = userData.avatar;
            screenToUpdate.userId = userData.id;
            screenToUpdate.role = effectiveRole;
            netSupportScreens.set(presenceDevKey, screenToUpdate);
            netSupportScreens.set(clientIp, screenToUpdate);
        }

        // Send current whiteboard history
        socket.emit('whiteboard_init', whiteboardHistory);
        // Send current shared codepad
        socket.emit('codepad_sync', { text: sharedCodePadText });
        // Send current focus mode state
        socket.emit('chat_focus_mode_changed', { isLocked: isChatFocusLocked });
        // Send stealth state if already engaged
        if (isStealthEngaged) {
            socket.emit('GLOBAL_STEALTH_ENGAGED', { timestamp: 0 });
        }
        // Send active screen share state if currently broadcasting
        if (activeScreenShare) {
            socket.emit('screen_share_started', activeScreenShare);
        }
        // Send active synchronized radio state
        if (activeRadioTrack) {
            let currentTime = 0;
            if (!activeRadioTrack.track?.isLive && activeRadioTrack.track?.id !== 'quran_cairo_live') {
                if (activeRadioTrack.isPlaying && activeRadioTrack.startedAt) {
                    currentTime = (Date.now() - activeRadioTrack.startedAt) / 1000;
                } else {
                    currentTime = activeRadioTrack.currentTime || 0;
                }
            }
            socket.emit('radio_sync_state', { ...activeRadioTrack, currentTime });
        }

        // Broadcast presence
        const onlineList = Array.from(userSockets.keys());
        io.emit('presence_update', { onlineUserIds: onlineList });
    });

    // 1. Send Message
    socket.on('send_message', async (data) => {
        try {
            if (isChatFocusLocked && data.role !== 'admin') {
                return socket.emit('error_notification', { message: 'الشات مقفول مؤقتاً بوضع التركيز من الأدمن!' });
            }

            const { senderId, recipientId, chatType, content, mediaUrl, mediaType, mediaName, mediaSize, disappearingSeconds } = data;
            const messageId = crypto.randomUUID();

            let isDisappearing = 0;
            let expiresAt = null;
            if (disappearingSeconds && Number(disappearingSeconds) > 0) {
                isDisappearing = 1;
                expiresAt = new Date(Date.now() + Number(disappearingSeconds) * 1000).toISOString().replace('T', ' ').slice(0, 19);
            }

            await run(
                `INSERT INTO messages (id, sender_id, recipient_id, chat_type, content, media_url, media_type, media_name, media_size, is_disappearing, expires_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [messageId, senderId, recipientId || null, chatType || 'general', content || '', mediaUrl || null, mediaType || 'text', mediaName || null, mediaSize || 0, isDisappearing, expiresAt]
            );

            // Fetch created message with sender info
            const newMsg = await get(
                `SELECT m.*, u.nickname as sender_name, u.avatar as sender_avatar, u.role as sender_role
                 FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?`,
                [messageId]
            );
            newMsg.reactions = [];

            // Update streak between sender and recipient
            let streakInfo = null;
            if (chatType === 'direct' && recipientId) {
                streakInfo = await recordInteraction(senderId, recipientId);
            }

            // Emit to appropriate clients
            if (chatType === 'general') {
                io.emit('new_message', { message: newMsg, streakInfo });
            } else if (chatType === 'direct') {
                // Send to sender sockets
                const senderSockets = userSockets.get(senderId);
                if (senderSockets) senderSockets.forEach(s => io.to(s).emit('new_message', { message: newMsg, streakInfo }));
                // Send to recipient sockets
                const recipientSockets = userSockets.get(recipientId);
                if (recipientSockets) recipientSockets.forEach(s => io.to(s).emit('new_message', { message: newMsg, streakInfo }));

                if (streakInfo) {
                    const streakPayload = {
                        userA: senderId,
                        userB: recipientId,
                        streak_count: streakInfo.streak_count,
                        is_frozen: streakInfo.is_frozen,
                        status: streakInfo.status,
                        interaction_count: streakInfo.interaction_count
                    };
                    if (senderSockets) senderSockets.forEach(sock => io.to(sock).emit('streak_updated', streakPayload));
                    if (recipientSockets) recipientSockets.forEach(sock => io.to(sock).emit('streak_updated', streakPayload));
                }
            } else if (chatType === 'group' && recipientId) {
                // Send to all members of this group
                const members = await all(`SELECT user_id FROM group_members WHERE group_id = ?`, [recipientId]);
                const memberSet = new Set(members.map(m => m.user_id));
                memberSet.add(senderId);
                memberSet.forEach(uid => {
                    const sockList = userSockets.get(uid);
                    if (sockList) sockList.forEach(s => io.to(s).emit('new_message', { message: newMsg, streakInfo: null }));
                });
            }
        } catch (err) {
            console.error('Error sending message:', err);
        }
    });

    // Mark Messages As Read (Seen / سين)
    socket.on('mark_messages_read', async ({ senderId, recipientId }) => {
        try {
            if (!senderId || !recipientId) return;
            const res = await run(
                `UPDATE messages SET is_read = 1, read_at = CURRENT_TIMESTAMP 
                 WHERE chat_type = 'direct' AND sender_id = ? AND recipient_id = ? AND is_read = 0`,
                [senderId, recipientId]
            );
            if (res.changes > 0) {
                const senderSockets = userSockets.get(senderId);
                if (senderSockets && senderSockets.size > 0) {
                    senderSockets.forEach(s => io.to(s).emit('messages_marked_read', {
                        readerId: recipientId,
                        readAt: new Date().toISOString()
                    }));
                }
            }
        } catch (err) {
            console.error('Error in mark_messages_read socket handler:', err);
        }
    });

    // 2. Typing Indicator
    socket.on('typing_start', (data) => {
        socket.broadcast.emit('user_typing_start', data);
    });

    socket.on('typing_stop', (data) => {
        socket.broadcast.emit('user_typing_stop', data);
    });

    // 3. Message Reaction
    socket.on('toggle_reaction', async ({ messageId, userId, emoji }) => {
        try {
            const existing = await get(`SELECT id, emoji FROM message_reactions WHERE message_id = ? AND user_id = ?`, [messageId, userId]);
            if (existing) {
                if (existing.emoji === emoji) {
                    await run(`DELETE FROM message_reactions WHERE id = ?`, [existing.id]);
                } else {
                    await run(`UPDATE message_reactions SET emoji = ? WHERE id = ?`, [emoji, existing.id]);
                }
            } else {
                const reactionId = crypto.randomUUID();
                await run(`INSERT INTO message_reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)`, [reactionId, messageId, userId, emoji]);
            }

            // Get updated reactions list
            const reactions = await all(
                `SELECT r.*, u.nickname as user_name FROM message_reactions r
                 JOIN users u ON r.user_id = u.id WHERE r.message_id = ?`,
                [messageId]
            );

            io.emit('message_reactions_updated', { messageId, reactions });
        } catch (err) {
            console.error('Error toggling reaction:', err);
        }
    });

    // 4. Collaborative Live Whiteboard
    socket.on('whiteboard_draw_step', (drawData) => {
        whiteboardHistory.push(drawData);
        if (whiteboardHistory.length > 2000) whiteboardHistory.shift();
        socket.broadcast.emit('whiteboard_draw_step', drawData);
    });

    socket.on('whiteboard_clear_board', () => {
        whiteboardHistory = [];
        io.emit('whiteboard_cleared');
    });

    socket.on('request_whiteboard_history', () => {
        socket.emit('whiteboard_init', whiteboardHistory);
    });

    // 4b. Collaborative Live CodePad / Plain Text Bin
    socket.on('codepad_update', async (data) => {
        sharedCodePadText = (data && data.text !== undefined) ? data.text : '';
        socket.broadcast.emit('codepad_sync', { text: sharedCodePadText, senderName: data.senderName });
        await run(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('shared_codepad', ?)`, [sharedCodePadText]);
    });

    socket.on('codepad_request_sync', () => {
        socket.emit('codepad_sync', { text: sharedCodePadText });
    });

    // 5. GLOBAL PANIC BUTTON ("زر البشمهندسة" 🚨)
    // Accessible by ANY student! Instantly broadcasts to everyone in <15ms
    socket.on('TRIGGER_GLOBAL_PANIC', async () => {
        isStealthEngaged = true;
        await run(`UPDATE system_settings SET value = '1' WHERE key = 'stealth_active'`);
        const senderInfo = onlineUsers.get(socket.id);
        console.log(`🚨 [GLOBAL PANIC] Triggered by ${senderInfo ? senderInfo.nickname : 'Unknown'} (${clientIp})`);
        io.emit('GLOBAL_STEALTH_ENGAGED', {
            triggeredBy: senderInfo ? senderInfo.nickname : 'أحد الزملاء',
            timestamp: Date.now()
        });
    });

    // 6. Stealth Release (Admin / Master Password only)
    socket.on('TRIGGER_STEALTH_RELEASE', async (pass) => {
        if (pass && pass.trim() === MASTER_PASSWORD) {
            isStealthEngaged = false;
            await run(`UPDATE system_settings SET value = '0' WHERE key = 'stealth_active'`);
            console.log(`✅ [STEALTH RELEASE] Broadcasted to all by socket ${socket.id}`);
            io.emit('GLOBAL_STEALTH_RELEASED', { message: 'تم إيقاف وضع التمويه! عدنا للدردشة 🚀' });
        }
    });

    // 7. Delete Message Socket Handler
    socket.on('delete_message', async ({ messageId, userId }) => {
        try {
            const isDeviceAdmin = isHostAdmin(clientIp, clientMac);
            const message = await get(`SELECT * FROM messages WHERE id = ?`, [messageId]);
            if (message && (isDeviceAdmin || message.sender_id === userId)) {
                await run(`DELETE FROM messages WHERE id = ?`, [messageId]);
                await run(`DELETE FROM message_reactions WHERE message_id = ?`, [messageId]);
                io.emit('message_deleted', { messageId });
            }
        } catch (err) {
            console.error('Error deleting message via socket:', err);
        }
    });

    // 8. Screen Share & WebRTC Signaling Hub 🖥️
    socket.on('get_screen_share_status', () => {
        socket.emit('screen_share_status', activeScreenShare);
    });

    socket.on('screen_share_start', (data) => {
        activeScreenShare = {
            presenterSocketId: socket.id,
            presenterId: data.presenterId,
            presenterName: data.presenterName,
            hasAudio: !!data.hasAudio,
            startedAt: Date.now()
        };
        console.log(`🖥️ [SCREEN SHARE] Started by ${data.presenterName} (${socket.id})`);
        io.emit('screen_share_started', activeScreenShare);
    });

    socket.on('screen_share_stop', () => {
        if (activeScreenShare && activeScreenShare.presenterSocketId === socket.id) {
            console.log(`⏹️ [SCREEN SHARE] Stopped by presenter (${socket.id})`);
            activeScreenShare = null;
            io.emit('screen_share_ended');
        }
    });

    // Signaling: Viewer requests to join presenter's stream
    socket.on('webrtc_viewer_join', (data) => {
        if (activeScreenShare) {
            io.to(activeScreenShare.presenterSocketId).emit('webrtc_viewer_joined', {
                viewerSocketId: socket.id,
                viewerName: data.viewerName || 'طالب'
            });
        }
    });

    // Signaling: Presenter sends offer to specific viewer
    socket.on('webrtc_offer', ({ targetSocketId, offer }) => {
        io.to(targetSocketId).emit('webrtc_offer', {
            presenterSocketId: socket.id,
            offer
        });
    });

    // Signaling: Viewer sends answer to presenter
    socket.on('webrtc_answer', ({ targetSocketId, answer }) => {
        io.to(targetSocketId).emit('webrtc_answer', {
            viewerSocketId: socket.id,
            answer
        });
    });

    // Signaling: ICE Candidate relay
    socket.on('webrtc_ice_candidate', ({ targetSocketId, candidate }) => {
        io.to(targetSocketId).emit('webrtc_ice_candidate', {
            fromSocketId: socket.id,
            candidate
        });
    });

    // 9. Synchronized Classroom Radio / Music Hub 🎵
    socket.on('get_radio_status', () => {
        let currentTime = 0;
        if (activeRadioTrack) {
            if (!activeRadioTrack.track?.isLive && activeRadioTrack.track?.id !== 'quran_cairo_live') {
                if (activeRadioTrack.isPlaying && activeRadioTrack.startedAt) {
                    currentTime = (Date.now() - activeRadioTrack.startedAt) / 1000;
                } else {
                    currentTime = activeRadioTrack.currentTime || 0;
                }
            }
            socket.emit('radio_sync_state', { ...activeRadioTrack, currentTime });
        } else {
            socket.emit('radio_sync_state', null);
        }
    });

    socket.on('radio_play', (data) => {
        activeRadioTrack = {
            track: data.track,
            currentTime: data.currentTime || 0,
            isPlaying: true,
            startedAt: Date.now() - ((data.currentTime || 0) * 1000),
            djName: data.djName || 'أحد الزملاء',
            djId: data.djId || null
        };
        console.log(`🎵 [RADIO PLAY] ${data.track?.title} by DJ ${data.djName}`);
        io.emit('radio_sync_state', activeRadioTrack);
    });

    socket.on('radio_pause', (data) => {
        if (activeRadioTrack) {
            activeRadioTrack.isPlaying = false;
            activeRadioTrack.currentTime = data.currentTime || 0;
            io.emit('radio_sync_state', activeRadioTrack);
        }
    });

    socket.on('radio_seek', (data) => {
        if (activeRadioTrack) {
            activeRadioTrack.currentTime = data.currentTime || 0;
            activeRadioTrack.startedAt = Date.now() - ((data.currentTime || 0) * 1000);
            io.emit('radio_sync_state', activeRadioTrack);
        }
    });

    socket.on('radio_stop', () => {
        activeRadioTrack = null;
        io.emit('radio_sync_state', null);
    });

    // A classroom device's <audio> reached the end of the current Quran surah —
    // advance everyone to the next one (debounced server-side against duplicate events).
    socket.on('quran_track_ended', () => {
        advanceQuranSurah();
    });

    // NetSupport client screen frame stream
    socket.on('netsupport_client_frame', async (data) => {
        if (data && data.frame) {
            const userInfo = onlineUsers.get(socket.id);
            const clientIp = userInfo?.ip || cleanIP(socket.handshake.address);
            const clientMac = userInfo?.mac || await resolveMacAddress(clientIp);
            const devKey = `dev_${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`;

            const existing = netSupportScreens.get(devKey) || netSupportScreens.get(clientIp) || {};
            const resolved = await resolveStudentInfo(clientIp, clientMac, data.userId || userInfo?.userId || existing.userId);
            const effectiveNickname = (data.nickname && data.nickname !== 'طالب') ? data.nickname : (resolved?.nickname || userInfo?.nickname || existing.nickname || `طالب_${clientIp.split('.').pop()}`);
            const effectiveAvatar = data.avatar || resolved?.avatar || userInfo?.avatar || existing.avatar || '🖥️';
            const effectiveUserId = data.userId || resolved?.id || userInfo?.userId || existing.userId || null;
            const effectiveRole = resolved?.role || userInfo?.role || existing.role || 'student';

            const screenData = {
                id: devKey,
                socketId: socket.id,
                userId: effectiveUserId,
                nickname: effectiveNickname,
                avatar: effectiveAvatar,
                role: effectiveRole,
                ip: clientIp,
                mac: clientMac || existing.mac || '',
                lastFrame: data.frame,
                lastFrameAt: Date.now(),
                isLocked: existing.isLocked || false,
                isStealth: existing.isStealth || false,
                currentApp: data.currentApp || 'متصفح نؤطة'
            };
            netSupportScreens.set(devKey, screenData);
            netSupportScreens.set(clientIp, screenData);

            for (const [sId, u] of onlineUsers.entries()) {
                if (u.role === 'admin') {
                    io.to(sId).emit('netsupport_device_frame_update', {
                        deviceId: devKey,
                        nickname: effectiveNickname,
                        avatar: effectiveAvatar,
                        ip: clientIp,
                        mac: clientMac || '',
                        lastFrame: data.frame,
                        lastFrameAt: Date.now(),
                        currentApp: data.currentApp || 'متصفح نؤطة',
                        isLocked: screenData.isLocked,
                        isStealth: screenData.isStealth
                    });
                }
            }
        }
    });

    // Disconnect Handling
    socket.on('disconnect', async () => {
        if (activeScreenShare && activeScreenShare.presenterSocketId === socket.id) {
            console.log(`⏹️ [SCREEN SHARE] Presenter disconnected, ending live stream`);
            activeScreenShare = null;
            io.emit('screen_share_ended');
        }
        const userInfo = onlineUsers.get(socket.id);
        if (userInfo) {
            onlineUsers.delete(socket.id);
            const userSet = userSockets.get(userInfo.userId);
            if (userSet) {
                userSet.delete(socket.id);
                if (userSet.size === 0) {
                    userSockets.delete(userInfo.userId);
                    await run(`UPDATE users SET is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE id = ?`, [userInfo.userId]);
                }
            }
            const onlineList = Array.from(userSockets.keys());
            io.emit('presence_update', { onlineUserIds: onlineList });
        }
    });
});

// ---------------------- BACKGROUND CLEANUP INTERVALS ----------------------

// 1. Cleanup expired disappearing messages every 1 second (supports 2s fast burn)
setInterval(async () => {
    try {
        const expired = await all(`SELECT id FROM messages WHERE is_disappearing = 1 AND expires_at < CURRENT_TIMESTAMP`);
        if (expired.length > 0) {
            const ids = expired.map(m => m.id);
            const placeholders = ids.map(() => '?').join(',');
            await run(`DELETE FROM messages WHERE id IN (${placeholders})`, ids);
            io.emit('disappearing_messages_expired', { messageIds: ids });
        }
    } catch (e) {
        // Silent error in background
    }
}, 1000);

// 2. Cleanup expired stories every 5 minutes
setInterval(async () => {
    try {
        await run(`DELETE FROM stories WHERE expires_at < CURRENT_TIMESTAMP`);
    } catch (e) {}
}, 5 * 60 * 1000);

// ---------------------- SERVER INITIALIZATION ----------------------

async function startServer() {
    await initDB();
    startBeacon(PORT);

    try {
        const codepadRow = await get(`SELECT value FROM system_settings WHERE key = 'shared_codepad'`);
        if (codepadRow && codepadRow.value !== null && codepadRow.value !== undefined) {
            sharedCodePadText = codepadRow.value;
        }
    } catch (e) {}

    server.listen(PORT, '0.0.0.0', async () => {
        const lanIps = getServerLanIPs();
        console.log('\n=============================================================');
        console.log('⚡🚀 تطبيق "نؤطة" (No2ta) - شبكة الفصل الاجتماعية والسرية يعمل بنجاح! 🚀⚡');
        console.log('=============================================================');
        console.log(`📡 الجهاز المحلي (Host): http://localhost:${PORT}`);
        lanIps.forEach(ip => {
            console.log(`🌐 رابط شبكة الفصل (${ip.interface}): http://${ip.address}:${PORT}`);
        });
        console.log(`🔑 كلمة المرور الرئيسية: ${MASTER_PASSWORD}`);
        console.log(`👑 الأدمن الحصري: محدد بالماك الفيزيائي للجهاز المضيف (Host) فقط ⚡`);
        console.log(`🚨 زر البشمهندسة مفعل ومتاح لجميع الطلاب عبر السيرفر اللحظي`);
        console.log('=============================================================\n');

        // Print ASCII QR Code for primary LAN IP in console
        const primary = lanIps.find(i => i.address.startsWith('192.168.')) || lanIps[0];
        if (primary) {
            try {
                const qrString = await QRCode.toString(`http://${primary.address}:${PORT}`, { type: 'terminal', small: true });
                console.log('📱 امسح الـ QR Code بكاميرا الموبايل للدخول المباشر:');
                console.log(qrString);
            } catch (err) {}
        }
    });
}

startServer();

~~~~


### المصدر: services/discover-host.ps1

~~~~ps1
# No2ta LAN Host Discovery
# Listens for the UDP beacon broadcast by services/discovery.js (startBeacon)
# and prints the current server URL (http://<ip>:<port>) to stdout.
# Falls back to the last successfully-discovered host (cached in %TEMP%) if
# no beacon is heard in time, so a brief network hiccup doesn't break it.
# Prints NOTFOUND if nothing is discoverable and there is no cache either.

param(
    [int]$TimeoutMs = 3000,
    [int]$BeaconPort = 5055
)

$cacheFile = Join-Path $env:TEMP 'no2ta_last_host.txt'
$result = $null

try {
    $udp = New-Object System.Net.Sockets.UdpClient($BeaconPort)
    $udp.Client.ReceiveTimeout = $TimeoutMs
    $remote = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, 0)
    $bytes = $udp.Receive([ref]$remote)
    $udp.Close()
    $json = [System.Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json
    if ($json.app -eq 'no2ta' -and $json.hostIp) {
        $result = "http://$($json.hostIp):$($json.port)"
        Set-Content -Path $cacheFile -Value $result -Force -Encoding UTF8
    }
} catch {
    # Beacon not heard in time (server off, different subnet, firewall...) — fall through to cache.
}

if (-not $result -and (Test-Path $cacheFile)) {
    $result = (Get-Content $cacheFile -Raw).Trim()
}

if ($result) {
    Write-Output $result
} else {
    Write-Output 'NOTFOUND'
}

~~~~


### المصدر: services/discovery.js

~~~~js
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

~~~~


### المصدر: services/find_server.js

~~~~js
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

~~~~


### المصدر: services/network.js

~~~~js
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

~~~~


### المصدر: services/streaks.js

~~~~js
const { run, get, all } = require('../data/db');
const crypto = require('crypto');

// Format date as YYYY-MM-DD
function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Checks if today is Friday (5) or Saturday (6)
function isWeekendFreeze(d = new Date()) {
    const day = d.getDay();
    return day === 5 || day === 6; // Friday & Saturday
}

// Order pair IDs deterministically so user_a < user_b
function getOrderedPair(userA, userB) {
    return userA < userB ? [userA, userB] : [userB, userA];
}

async function recordInteraction(user1, user2) {
    if (!user1 || !user2 || user1 === user2) return null;

    const [uA, uB] = getOrderedPair(user1, user2);
    const todayStr = getLocalDateString();
    const now = new Date();
    const isFrozen = isWeekendFreeze(now) ? 1 : 0;

    const existing = await get(
        `SELECT * FROM streaks WHERE user_a = ? AND user_b = ?`,
        [uA, uB]
    );

    if (!existing) {
        // First interaction ever
        const id = crypto.randomUUID();
        await run(
            `INSERT INTO streaks (id, user_a, user_b, streak_count, last_interaction_date, is_frozen, interaction_count)
             VALUES (?, ?, ?, 1, ?, ?, 1)`,
            [id, uA, uB, todayStr, isFrozen]
        );
        return { streak_count: 1, is_frozen: isFrozen, status: 'new', interaction_count: 1 };
    }

    const lastDateStr = existing.last_interaction_date;
    const currentInteractions = (existing.interaction_count || 1);

    // SAME DAY: Active conversation progress
    if (lastDateStr === todayStr) {
        const nextInteractions = currentInteractions + 1;
        let newStreak = existing.streak_count;
        let status = 'same_day';

        // Every 3 direct messages exchanged in the session gives a +1 boost!
        if (nextInteractions % 3 === 0) {
            newStreak += 1;
            status = 'boosted';
        }

        await run(
            `UPDATE streaks SET streak_count = ?, is_frozen = ?, interaction_count = ? WHERE id = ?`,
            [newStreak, isFrozen, nextInteractions, existing.id]
        );

        return {
            streak_count: newStreak,
            is_frozen: isFrozen,
            status: status,
            interaction_count: nextInteractions
        };
    }

    // DIFFERENT DAY: Consecutive classroom days & grace period
    const diffTime = Math.abs(new Date(todayStr).getTime() - new Date(lastDateStr).getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let newCount = existing.streak_count;
    let status = 'updated';

    // Generous classroom grace period (up to 5 days covers weekends, holidays, and lab schedules)
    if (diffDays <= 5) {
        newCount += 1;
    } else {
        // If they missed more than 5 days, preserve partial progress so they aren't discouraged
        newCount = Math.max(1, Math.floor(existing.streak_count / 2) + 1);
    }

    await run(
        `UPDATE streaks SET streak_count = ?, last_interaction_date = ?, is_frozen = ?, interaction_count = 1 WHERE id = ?`,
        [newCount, todayStr, isFrozen, existing.id]
    );

    return {
        streak_count: newCount,
        is_frozen: isFrozen,
        status: status,
        interaction_count: 1
    };
}

async function getStreakBetween(user1, user2) {
    if (!user1 || !user2 || user1 === user2) return null;
    const [uA, uB] = getOrderedPair(user1, user2);
    const row = await get(`SELECT * FROM streaks WHERE user_a = ? AND user_b = ?`, [uA, uB]);
    const isFrozen = isWeekendFreeze() ? 1 : 0;
    if (!row) {
        return { streak_count: 0, is_frozen: isFrozen };
    }
    return { ...row, is_frozen: isFrozen || row.is_frozen };
}

async function getAllUserStreaks(userId) {
    const isFrozen = isWeekendFreeze() ? 1 : 0;
    const rows = await all(
        `SELECT s.*, 
            uA.nickname as user_a_name, uA.avatar as user_a_avatar,
            uB.nickname as user_b_name, uB.avatar as user_b_avatar
         FROM streaks s
         JOIN users uA ON s.user_a = uA.id
         JOIN users uB ON s.user_b = uB.id
         WHERE s.user_a = ? OR s.user_b = ?`,
        [userId, userId]
    );

    return rows.map(r => ({
        ...r,
        is_frozen: isFrozen || r.is_frozen,
        other_user_id: r.user_a === userId ? r.user_b : r.user_a,
        other_user_name: r.user_a === userId ? r.user_b_name : r.user_a_name,
        other_user_avatar: r.user_a === userId ? r.user_b_avatar : r.user_a_avatar
    }));
}

module.exports = {
    recordInteraction,
    getStreakBetween,
    getAllUserStreaks,
    isWeekendFreeze
};

~~~~


### المصدر: Start_No2ta.bat

~~~~bat
@echo off
chcp 65001 >nul
title No2ta - شبكة الفصل الاجتماعية والسرية
color 0B

cd /d "%~dp0"

echo =========================================================================
echo    ⚡🚀 جاري تشغيل منصة "نؤطة" (No2ta) - شبكة الفصل الاجتماعية 🚀⚡
echo =========================================================================
echo.

:: 1. Hardware MAC Check: STRICTLY only device D0:8E:79:18:9F:A0 can host/be admin!
getmac /fo csv /nh | findstr /i "D0-8E-79-18-9F-A0" >nul
if %errorlevel% equ 0 (
    goto ADMIN_HOST_MODE
) else (
    goto STUDENT_CLIENT_MODE
)

:STUDENT_CLIENT_MODE
echo  [+] تم فحص الجهاز عبر كارت الشبكة: جهاز طالب في الفصل.
echo  [+] جاري البحث التلقائي عن سيرفر الفصل على الشبكة...
echo.

set "HOST_URL="
for /f "usebackq delims=" %%A in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0services\discover-host.ps1"`) do set "HOST_URL=%%A"

if "%HOST_URL%"=="" set "HOST_URL=NOTFOUND"
if "%HOST_URL%"=="NOTFOUND" (
    echo  [X] مفيش سيرفر فصل شغال على الشبكة دلوقتي!
    echo      تأكد إن جهاز الأدمن شغّل السيرفر وإنك على نفس شبكة الواي فاي/الكابل.
    pause
    exit /b
)

echo  [+] تم إيجاد سيرفر الفصل: %HOST_URL%
echo  [+] جاري فتح المتصفح والدخول المباشر للشات مع زملائك...
start "" "%HOST_URL%"
timeout /t 2 /nobreak >nul
exit /b

:ADMIN_HOST_MODE
echo  [+] تم التحقق بالماك الفيزيائي: جهاز الأدمن الحصري (Admin Host) 👑⚡
echo.

:: 2. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] خطأ: برنامج Node.js غير مثبت على هذا الجهاز!
    echo يرجى تحميله وتثبيته أولاً من: https://nodejs.org
    pause
    exit /b
)

:: 3. Check and auto-install dependencies
echo [+] جاري فحص مكتبات التشغيل (Dependencies)...
node -e "require('express'); require('socket.io'); require('sqlite3'); require('multer'); require('cors'); require('qrcode');" >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo =========================================================================
    echo  [!] الحزم غير مثبتة! جاري التثبيت التلقائي لأول مرة عبر npm install...
    echo =========================================================================
    echo.
    where npm.cmd >nul 2>nul
    if %errorlevel% equ 0 (
        call npm.cmd install --no-audit --no-fund
    ) else (
        call npm install --no-audit --no-fund
    )
    if %errorlevel% neq 0 (
        echo [X] حدث خطأ أثناء تثبيت الحزم! يرجى التأكد من اتصال الإنترنت لأول مرة.
        pause
        exit /b
    )
    echo  [+] تم تثبيت كافة الحزم والمكتبات بنجاح 100%%! 🚀
) else (
    echo  [+] تم التحقق: جميع الحزم مثبتة وجاهزة للعمل! ✅
)

echo.
echo =========================================================================
echo  [+] جاري تشغيل سيرفر الفصل الرئيسي (Host Server)...
echo.
echo  📡 رابط السيرفر لجميع الطلاب في الفصل:
echo     http://192.168.20.54:5000
echo =========================================================================

:: Attempt to open port 5000 in Windows Firewall silently
netsh advfirewall firewall add rule name="No2ta Classroom Server" dir=in action=allow protocol=TCP localport=5000 >nul 2>nul

start "" "http://localhost:5000"
node server.js

pause

~~~~
