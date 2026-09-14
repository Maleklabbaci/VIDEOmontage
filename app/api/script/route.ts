import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Tone = 'energetic' | 'educational' | 'sales' | 'story';

const templates: Record<Tone, Array<[string, string]>> = {
  energetic: [
    ["Salam! Lyom rah n'hadro 3la {topic}.", 'سلام! اليوم راح نهضرو على {topic}.'],
    ["Hadi hiya tariqa li tkhallik tebda sah.", 'هذي هي الطريقة لي تخليك تبدا صح.'],
    ["Awal haja, khalli l'objectif ta3ek wadah.", 'أول حاجة، خلي الهدف تاعك واضح.'],
    ["Ba3d, khayyer les outils li ysehlou 3lik.", 'بعد، خير الأدوات لي يسهلو عليك.'],
    ["Ma t3aqqedhach, khdem étape par étape.", 'ما تعقدهاش، اخدم خطوة بخطوة.'],
    ["Jareb, qiyes natija, w hassan kol mara.", 'جرب، قيس النتيجة، وحسن كل مرة.'],
    ["W hakda twelli asra3 w resultat yban pro.", 'وهكدا تولي أسرع والنتيجة تبان برو.'],
    ["Ila 3ejbek, sauvegardi had lvideo w abda daba.", 'إذا عجبك، سافيڨاردي هذا الفيديو وابدا درك.'],
  ],
  educational: [
    ["Salam, f had lvideo nefhmou {topic} b sehla.", 'سلام، في هذا الفيديو نفهمو {topic} ببساطة.'],
    ["Nbdaw bel ma3na l'assassi w 3lach mouhim.", 'نبداو بالمعنى الأساسي وعلاش مهم.'],
    ["Lfikra hiya belli kol etape tebni 3la li qbelha.", 'الفكرة هي بلي كل مرحلة تبني على لي قبلها.'],
    ["Dir exemple sghir bach tchouf lfarq direct.", 'دير مثال صغير باش تشوف الفرق مباشرة.'],
    ["Rakez 3la ljouda, machi ghir sor3a.", 'ركز على الجودة، ماشي غير السرعة.'],
    ["Ki tekmel, raje3 natija w sa77e7 lakhta2.", 'كي تكمل، راجع النتيجة وصحح الأخطاء.'],
    ["Hadi hiya tariqa sahla bach tet3allem b sor3a.", 'هذي هي الطريقة السهلة باش تتعلم بسرعة.'],
  ],
  sales: [
    ["Ila rak thaws 3la {topic}, sma3 mli7.", 'إذا راك تحوس على {topic}، اسمع مليح.'],
    ["Had lhal ywafarlek lwaqt w ya3tik natija pro.", 'هذا الحل يوفرلك الوقت ويعطيك نتيجة برو.'],
    ["Ma te7tajch khibra kbira bach tebda.", 'ما تحتاجش خبرة كبيرة باش تبدا.'],
    ["Kolchi wade7, srii3 w msayeb l darija.", 'كلشي واضح، سريع ومصمم للدارجة.'],
    ["Tqder tjareb b ro7ek w tchouf lfarq.", 'تقدر تجرب بنفسك وتشوف الفرق.'],
    ["Abda lyoum w khalli lmo7tawa ta3ek yban khir.", 'ابدا اليوم وخلي المحتوى تاعك يبان خير.'],
  ],
  story: [
    ["Nhar men liyyam, kont nlawwej 3la {topic}.", 'نهار من الأيام، كنت نلوج على {topic}.'],
    ["Jarebt bezaf toro9, bessah natija ma kanetch mliha.", 'جربت بزاف طرق، بصح النتيجة ما كانتش مليحة.'],
    ["Ba3d fhemt belli lmochkil kan f tandhim.", 'بعد فهمت بلي المشكل كان في التنظيم.'],
    ["Bdit khotwa b khotwa w bedelt tariqa ta3i.", 'بديت خطوة بخطوة وبدلت الطريقة تاعي.'],
    ["Chwiya b chwiya, natija wellet tban.", 'شوية بشوية، النتيجة ولات تبان.'],
    ["Lyoum ncharek m3ak wach t3allemt.", 'اليوم نشارك معاك واش تعلمت.'],
    ["Lkholasa: abda bsit w hassan m3a lwaqt.", 'الخلاصة: ابدا بسيط وحسن مع الوقت.'],
  ],
};

export async function POST(request: Request) {
  const input = await request.json();
  const topic = String(input.topic ?? '').trim().slice(0, 120);
  if (topic.length < 3) return NextResponse.json({ error: 'Écris un sujet d’au moins 3 caractères.' }, { status: 400 });
  const tone: Tone = ['energetic', 'educational', 'sales', 'story'].includes(input.tone) ? input.tone : 'energetic';
  const duration = Math.min(90, Math.max(10, Number(input.duration) || 30));
  const segmentCount = Math.max(3, Math.min(20, Math.round(duration / 3.8)));
  const source = templates[tone];
  const selected = Array.from({ length: segmentCount }, (_, index) => source[index % source.length]);
  const segmentDuration = duration / selected.length;
  const captions = selected.map(([latin, arabic], index) => ({
    id: `generated-${Date.now().toString(36)}-${index}`,
    start: Number((index * segmentDuration).toFixed(3)),
    end: Number(((index + 1) * segmentDuration).toFixed(3)),
    text: latin.replaceAll('{topic}', topic),
    textAr: arabic.replaceAll('{topic}', topic),
  }));
  return NextResponse.json({
    topic,
    tone,
    duration,
    script: captions.map((caption) => caption.text).join(' '),
    scriptAr: captions.map((caption) => caption.textAr).join(' '),
    captions,
    engine: 'darja-template-local-v1',
  });
}
