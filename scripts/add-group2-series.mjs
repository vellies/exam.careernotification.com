// Usage: npm run add:group2
// ADDITIVE — does not delete anything. Adds TNPSC Group 2 (subject,
// exam), one paid test series and 5 published tests with bilingual questions.
// Safe to re-run: exits without changes if the series already exists.
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const now = new Date();
const oid = () => new ObjectId();
const SERIES_SLUG = "tnpsc-group-2-full-length-mock-test";

// Every text is [english, tamil].
// [tag, difficulty, question, options (CORRECT FIRST), explanation].
// The correct option is rotated to a different slot per question below.
const Q = [
  ["polity", "easy", ["Article 21 of the Indian Constitution deals with which right?", "இந்திய அரசியலமைப்பின் விதி 21 எந்த உரிமையைப் பற்றியது?"],
    [["Protection of life and personal liberty", "வாழ்வுரிமை மற்றும் தனிமனித சுதந்திரப் பாதுகாப்பு"], ["Right to equality", "சமத்துவ உரிமை"], ["Freedom of speech and expression", "பேச்சு மற்றும் கருத்துச் சுதந்திரம்"], ["Right against exploitation", "சுரண்டலுக்கு எதிரான உரிமை"]],
    ["Article 21 guarantees protection of life and personal liberty.", "விதி 21 வாழ்வுரிமை மற்றும் தனிமனித சுதந்திரப் பாதுகாப்பை உறுதி செய்கிறது."]],
  ["polity", "easy", ["Who is known as the 'Father of the Indian Constitution'?", "'இந்திய அரசியலமைப்பின் தந்தை' என அழைக்கப்படுபவர் யார்?"],
    [["Dr. B. R. Ambedkar", "டாக்டர் பி. ஆர். அம்பேத்கர்"], ["Jawaharlal Nehru", "ஜவகர்லால் நேரு"], ["Dr. Rajendra Prasad", "டாக்டர் ராஜேந்திர பிரசாத்"], ["Sardar Vallabhbhai Patel", "சர்தார் வல்லபாய் படேல்"]],
    ["Dr. Ambedkar chaired the Drafting Committee of the Constituent Assembly.", "அரசியலமைப்பு நிர்ணய சபையின் வரைவுக் குழுவுக்கு டாக்டர் அம்பேத்கர் தலைவராக இருந்தார்."]],
  ["polity", "medium", ["What is the minimum age required to become the President of India?", "இந்தியக் குடியரசுத் தலைவராக ஆவதற்குத் தேவையான குறைந்தபட்ச வயது என்ன?"],
    [["35 years", "35 ஆண்டுகள்"], ["25 years", "25 ஆண்டுகள்"], ["30 years", "30 ஆண்டுகள்"], ["40 years", "40 ஆண்டுகள்"]],
    ["Article 58 requires a candidate to be at least 35 years old.", "விதி 58 இன்படி வேட்பாளர் குறைந்தது 35 வயதுடையவராக இருக்க வேண்டும்."]],
  ["polity", "medium", ["Fundamental Duties were added to the Constitution by which Amendment?", "அடிப்படைக் கடமைகள் எந்த திருத்தத்தின் மூலம் அரசியலமைப்பில் சேர்க்கப்பட்டன?"],
    [["42nd Amendment", "42வது திருத்தம்"], ["44th Amendment", "44வது திருத்தம்"], ["52nd Amendment", "52வது திருத்தம்"], ["73rd Amendment", "73வது திருத்தம்"]],
    ["The 42nd Amendment (1976) added Part IV-A on Fundamental Duties.", "42வது திருத்தம் (1976) பகுதி IV-A இல் அடிப்படைக் கடமைகளைச் சேர்த்தது."]],
  ["economy", "medium", ["Who issues one-rupee notes in India?", "இந்தியாவில் ஒரு ரூபாய் நோட்டுகளை வெளியிடுவது யார்?"],
    [["Ministry of Finance, Government of India", "இந்திய அரசின் நிதி அமைச்சகம்"], ["Reserve Bank of India", "இந்திய ரிசர்வ் வங்கி"], ["State Bank of India", "பாரத ஸ்டேட் வங்கி"], ["NITI Aayog", "நிதி ஆயோக்"]],
    ["One-rupee notes and coins are issued by the Ministry of Finance; other notes by the RBI.", "ஒரு ரூபாய் நோட்டுகள் நிதி அமைச்சகத்தால் வெளியிடப்படுகின்றன; மற்றவை ரிசர்வ் வங்கியால்."]],
  ["economy", "easy", ["When was the Goods and Services Tax (GST) introduced in India?", "இந்தியாவில் சரக்கு மற்றும் சேவை வரி (GST) எப்போது அமல்படுத்தப்பட்டது?"],
    [["1 July 2017", "1 ஜூலை 2017"], ["1 April 2016", "1 ஏப்ரல் 2016"], ["1 January 2018", "1 ஜனவரி 2018"], ["26 January 2017", "26 ஜனவரி 2017"]],
    ["GST came into effect on 1 July 2017.", "GST 2017 ஜூலை 1 அன்று நடைமுறைக்கு வந்தது."]],
  ["economy", "easy", ["Where is the headquarters of the Reserve Bank of India located?", "இந்திய ரிசர்வ் வங்கியின் தலைமையகம் எங்கு அமைந்துள்ளது?"],
    [["Mumbai", "மும்பை"], ["New Delhi", "புது டெல்லி"], ["Kolkata", "கொல்கத்தா"], ["Chennai", "சென்னை"]],
    ["The RBI headquarters is in Mumbai.", "ரிசர்வ் வங்கியின் தலைமையகம் மும்பையில் உள்ளது."]],
  ["tnhistory", "medium", ["Gangaikonda Cholapuram was founded as a capital by which Chola king?", "கங்கைகொண்ட சோழபுரத்தைத் தலைநகராக நிறுவிய சோழ மன்னர் யார்?"],
    [["Rajendra Chola I", "முதலாம் இராசேந்திர சோழன்"], ["Raja Raja Chola I", "முதலாம் இராசராச சோழன்"], ["Kulothunga Chola I", "முதலாம் குலோத்துங்க சோழன்"], ["Vijayalaya Chola", "விஜயாலய சோழன்"]],
    ["Rajendra Chola I built Gangaikonda Cholapuram after his Ganga campaign.", "கங்கைப் படையெடுப்புக்குப் பின் முதலாம் இராசேந்திரன் கங்கைகொண்ட சோழபுரத்தை உருவாக்கினார்."]],
  ["tnhistory", "easy", ["Who built the Brihadeeswarar Temple at Thanjavur?", "தஞ்சாவூர் பிரகதீஸ்வரர் கோயிலைக் கட்டியவர் யார்?"],
    [["Raja Raja Chola I", "முதலாம் இராசராச சோழன்"], ["Rajendra Chola I", "முதலாம் இராசேந்திர சோழன்"], ["Mahendravarman I", "முதலாம் மகேந்திரவர்மன்"], ["Narasimhavarman II", "இரண்டாம் நரசிம்மவர்மன்"]],
    ["Raja Raja Chola I completed the temple in about 1010 CE.", "முதலாம் இராசராச சோழன் இக்கோயிலை ஏறத்தாழ கி.பி. 1010 இல் கட்டி முடித்தார்."]],
  ["tnhistory", "easy", ["Who is the author of the Tirukkural?", "திருக்குறளை இயற்றியவர் யார்?"],
    [["Thiruvalluvar", "திருவள்ளுவர்"], ["Ilango Adigal", "இளங்கோவடிகள்"], ["Kambar", "கம்பர்"], ["Avvaiyar", "ஔவையார்"]],
    ["The Tirukkural, a work of 1330 couplets, was written by Thiruvalluvar.", "1330 குறள்களைக் கொண்ட திருக்குறளை இயற்றியவர் திருவள்ளுவர்."]],
  ["tnhistory", "medium", ["Who composed the Tamil epic Silappatikaram?", "சிலப்பதிகாரம் என்ற தமிழ்க் காப்பியத்தை இயற்றியவர் யார்?"],
    [["Ilango Adigal", "இளங்கோவடிகள்"], ["Sittalai Sathanar", "சீத்தலைச் சாத்தனார்"], ["Kambar", "கம்பர்"], ["Thirutakkadevar", "திருத்தக்கதேவர்"]],
    ["Ilango Adigal, a Chera prince turned monk, wrote the Silappatikaram.", "சேர இளவரசரான இளங்கோவடிகள் சிலப்பதிகாரத்தை இயற்றினார்."]],
  ["science", "easy", ["What is the chemical symbol of sodium?", "சோடியத்தின் வேதிக் குறியீடு என்ன?"],
    [["Na", "Na"], ["S", "S"], ["So", "So"], ["N", "N"]],
    ["The symbol Na for sodium comes from its Latin name natrium.", "சோடியத்தின் குறியீடு Na, அதன் இலத்தீன் பெயர் நேட்ரியத்திலிருந்து வந்தது."]],
  ["science", "easy", ["What is the SI unit of force?", "விசையின் SI அலகு என்ன?"],
    [["Newton", "நியூட்டன்"], ["Joule", "ஜூல்"], ["Watt", "வாட்"], ["Pascal", "பாஸ்கல்"]],
    ["Force is measured in newtons (kg·m/s²).", "விசை நியூட்டனில் (கி.கி·மீ/வி²) அளக்கப்படுகிறது."]],
  ["science", "medium", ["Which vitamin is produced in the skin on exposure to sunlight?", "சூரிய ஒளி படும்போது தோலில் உற்பத்தியாகும் வைட்டமின் எது?"],
    [["Vitamin D", "வைட்டமின் D"], ["Vitamin A", "வைட்டமின் A"], ["Vitamin C", "வைட்டமின் C"], ["Vitamin K", "வைட்டமின் K"]],
    ["Sunlight helps the skin synthesise vitamin D.", "சூரிய ஒளி தோலில் வைட்டமின் D உருவாக உதவுகிறது."]],
  ["science", "easy", ["Which gas is the most abundant in Earth's atmosphere?", "புவியின் வளிமண்டலத்தில் மிக அதிகமாக உள்ள வாயு எது?"],
    [["Nitrogen", "நைட்ரஜன்"], ["Oxygen", "ஆக்சிஜன்"], ["Carbon dioxide", "கார்பன் டை ஆக்சைடு"], ["Argon", "ஆர்கான்"]],
    ["Nitrogen makes up about 78% of the atmosphere.", "வளிமண்டலத்தில் ஏறத்தாழ 78% நைட்ரஜன் ஆகும்."]],
];

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set in .env.local");
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || "careernotification");

  if (await db.collection("testseries").findOne({ slug: SERIES_SLUG })) {
    console.log("Group 2 series already exists — nothing to do.");
    await client.close();
    return;
  }

  const board = await db.collection("boards").findOne({ slug: "tnpsc" });
  const category = await db.collection("examcategories").findOne({ slug: "state-government-exams" });
  if (!board || !category) throw new Error("Expected the TNPSC board and State Government Exams category to exist.");

  const meta = { status: "active", createdAt: now, updatedAt: now };
  const subjectId = oid();
  await db.collection("subjects").insertOne({ _id: subjectId, name: "General Studies (Group 2)", nameTa: "பொது அறிவு (குரூப் 2)", slug: "general-studies-group-2", boardId: board._id, ...meta });

  const examId = oid();
  await db.collection("exams").insertOne({
    _id: examId,
    name: "TNPSC Group 2",
    nameTa: "TNPSC குரூப் 2",
    slug: "tnpsc-group-2",
    examCategoryId: category._id,
    description: "Combined Civil Services Examination II (Interview and Non-Interview posts).",
    descriptionTa: "ஒருங்கிணைந்த குடிமைப் பணிகள் தேர்வு II (நேர்முகத் தேர்வு மற்றும் நேர்முகமற்ற பணியிடங்கள்).",
    ...meta,
  });

  const seriesId = oid();
  await db.collection("testseries").insertOne({
    _id: seriesId,
    title: "TNPSC Group 2 Full Length Mock Test",
    titleTa: "TNPSC குரூப் 2 முழு நீள மாதிரித் தேர்வு",
    slug: SERIES_SLUG,
    examId,
    description: "Full length mock test series for TNPSC Group 2 aspirants.",
    descriptionTa: "TNPSC குரூப் 2 தேர்வர்களுக்கான முழு நீள மாதிரித் தேர்வுத் தொடர்.",
    access: "paid",
    price: 499,
    startDate: null,
    endDate: null,
    status: "published",
    createdAt: now,
    updatedAt: now,
  });

  const questionDocs = Q.map(([tag, difficulty, question, options, explanation], i) => {
    const shift = i % 4; // move the correct answer (index 0) to a different slot per question
    const ordered = options.map((_, k) => options[(k - shift + 4) % 4]);
    return {
      _id: oid(),
      type: "mcq_single",
      question: { en: question[0], ta: question[1] },
      options: ordered.map((o, k) => ({ id: "abcd"[k], text: { en: o[0], ta: o[1] } })),
      correctAnswer: "abcd"[shift],
      explanation: { en: explanation[0], ta: explanation[1] },
      difficulty,
      subjectId,
      tags: ["tnpsc-group-2", tag],
      status: "published",
      createdAt: now,
      updatedAt: now,
    };
  });
  await db.collection("questions").insertMany(questionDocs);

  const perTest = 10;
  const testDocs = [];
  for (let t = 0; t < 5; t++) {
    const picked = Array.from({ length: perTest }, (_, k) => questionDocs[(t * 3 + k) % questionDocs.length]);
    testDocs.push({
      _id: oid(),
      title: `TNPSC Group 2 Mock Test ${t + 1}`,
      titleTa: `TNPSC குரூப் 2 மாதிரித் தேர்வு ${t + 1}`,
      testSeriesId: seriesId,
      durationSeconds: 900,
      negativeMarking: true,
      defaultNegativeMarks: 0.25,
      shuffleQuestions: false,
      shuffleOptions: true,
      opensAt: null,
      closesAt: null,
      status: "published",
      questions: picked.map((q, idx) => ({ questionId: q._id, order: idx + 1, marks: 1, negativeMarks: 0.25 })),
      createdAt: now,
      updatedAt: now,
    });
  }
  await db.collection("tests").insertMany(testDocs);

  console.log(`Added Group 2: 1 exam, 1 series (Rs.499), ${questionDocs.length} questions, ${testDocs.length} tests.`);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
