// Usage: npm run reset:group4
// Wipes ALL content data (syllabus, exams, test series, tests, questions,
// attempts, purchases) but leaves the Users collection untouched, then seeds
// exactly one TNPSC Group 4 test series with 9 published tests.
//
// Uses the native MongoDB driver directly (not Mongoose models) for both the
// wipe and the insert — this sidesteps a bug we hit earlier where a locally
// redefined Mongoose schema silently dropped fields it didn't declare.
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const now = new Date();
const oid = () => new ObjectId();

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Add it to .env.local before running.");
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || "careernotification");

  console.log("Connected. Wiping all content data (Users untouched)...");

  const contentCollections = [
    "boards",
    "subjects",
    "examcategories",
    "exams",
    "testseries",
    "tests",
    "questions",
    "attempts",
    "purchases",
  ];
  for (const name of contentCollections) {
    const res = await db.collection(name).deleteMany({});
    console.log(`  ${name}: deleted ${res.deletedCount}`);
  }

  // ---- Minimal syllabus: TNPSC > 2 subjects ----
  const boardId = oid();
  const gsSubjectId = oid();
  const aptSubjectId = oid();

  await db.collection("boards").insertOne({
    _id: boardId,
    name: "TNPSC",
    nameTa: "தமிழக அரசுப் பணியாளர் தேர்வாணையம்",
    slug: "tnpsc",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  await db.collection("subjects").insertMany([
    {
      _id: gsSubjectId,
      name: "General Studies",
      nameTa: "பொது அறிவு",
      slug: "general-studies",
      boardId,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: aptSubjectId,
      name: "Aptitude & Mental Ability",
      nameTa: "திறன் மற்றும் மனத்திறன்",
      slug: "aptitude-mental-ability",
      boardId,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  console.log("Seeded TNPSC board and subjects.");

  // ---- Exam category, exam, test series ----
  const categoryId = oid();
  await db.collection("examcategories").insertOne({
    _id: categoryId,
    name: "State Government Exams",
    nameTa: "மாநில அரசு தேர்வுகள்",
    slug: "state-government-exams",
    status: "active",
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  });

  const examId = oid();
  await db.collection("exams").insertOne({
    _id: examId,
    name: "TNPSC Group 4",
    nameTa: "TNPSC குரூப் 4",
    slug: "tnpsc-group-4",
    examCategoryId: categoryId,
    description: "Village Administrative Officer & allied posts.",
    descriptionTa: "கிராம நிர்வாக அலுவலர் மற்றும் தொடர்புடைய பணியிடங்கள்.",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  const seriesId = oid();
  await db.collection("testseries").insertOne({
    _id: seriesId,
    title: "TNPSC Group 4 Full Length Mock Test",
    titleTa: "TNPSC குரூப் 4 முழு நீள மாதிரித் தேர்வு",
    slug: "tnpsc-group-4-full-length-mock-test",
    examId,
    description: "Full length mock test series for TNPSC Group 4 aspirants.",
    descriptionTa: "TNPSC குரூப் 4 தேர்வர்களுக்கான முழு நீள மாதிரித் தேர்வுத் தொடர்.",
    access: "paid",
    price: 499,
    status: "published",
    createdAt: now,
    updatedAt: now,
  });

  console.log("Seeded exam category, exam, and one paid test series (₹499).");

  // ---- Question pool (bilingual EN/TA, General Studies + Aptitude) ----
  const bilingual = (en, ta) => ({ en, ta });
  const questionPlan = [
    {
      question: bilingual("Who was the founder of the Maurya Empire?", "மௌரிய பேரரசை நிறுவியவர் யார்?"),
      options: [
        { id: "a", text: bilingual("Chandragupta Maurya", "சந்திரகுப்த மௌரியர்") },
        { id: "b", text: bilingual("Ashoka", "அசோகர்") },
        { id: "c", text: bilingual("Bindusara", "பிந்துசாரர்") },
        { id: "d", text: bilingual("Samudragupta", "சமுத்திரகுப்தர்") },
      ],
      correctAnswer: "a",
      explanation: bilingual(
        "Chandragupta Maurya founded the Maurya Empire around 322 BCE with the guidance of Chanakya.",
        "சந்திரகுப்த மௌரியர் சாணக்கியரின் வழிகாட்டுதலுடன் கிமு 322 இல் மௌரிய பேரரசை நிறுவினார்.",
      ),
      difficulty: "easy",
      subjectId: gsSubjectId,
      tags: ["history", "ancient-india"],
    },
    {
      question: bilingual(
        "Which battle marked the end of the Maratha Empire?",
        "மராட்டியப் பேரரசின் முடிவைக் குறித்த போர் எது?",
      ),
      options: [
        { id: "a", text: bilingual("Battle of Plassey", "பிளாசி போர்") },
        { id: "b", text: bilingual("Third Battle of Panipat", "மூன்றாம் பானிபட் போர்") },
        { id: "c", text: bilingual("Battle of Buxar", "பக்சார் போர்") },
        { id: "d", text: bilingual("Third Anglo-Maratha War", "மூன்றாம் ஆங்கிலோ-மராட்டியப் போர்") },
      ],
      correctAnswer: "d",
      explanation: bilingual(
        "The Third Anglo-Maratha War (1817-1818) ended Maratha power and established British paramountcy in India.",
        "மூன்றாம் ஆங்கிலோ-மராட்டியப் போர் (1817-1818) மராட்டிய ஆட்சியை முடிவுக்குக் கொண்டுவந்து இந்தியாவில் ஆங்கிலேயர் மேலாதிக்கத்தை நிலைநாட்டியது.",
      ),
      difficulty: "medium",
      subjectId: gsSubjectId,
      tags: ["history", "modern-india"],
    },
    {
      question: bilingual(
        "Who gave the call 'Do or Die' during the Quit India Movement?",
        "வெள்ளையனே வெளியேறு இயக்கத்தின் போது 'செய் அல்லது செத்து மடி' என்ற அறைகூவலை விடுத்தவர் யார்?",
      ),
      options: [
        { id: "a", text: bilingual("Mahatma Gandhi", "மகாத்மா காந்தி") },
        { id: "b", text: bilingual("Subhas Chandra Bose", "சுபாஷ் சந்திரபோஸ்") },
        { id: "c", text: bilingual("Jawaharlal Nehru", "ஜவகர்லால் நேரு") },
        { id: "d", text: bilingual("Bal Gangadhar Tilak", "பாலகங்காதர திலகர்") },
      ],
      correctAnswer: "a",
      explanation: bilingual(
        "Mahatma Gandhi gave the 'Do or Die' call at the start of the Quit India Movement in August 1942.",
        "1942 ஆகஸ்ட் மாதம் வெள்ளையனே வெளியேறு இயக்கம் தொடங்கியபோது மகாத்மா காந்தி 'செய் அல்லது செத்து மடி' என்ற அறைகூவலை விடுத்தார்.",
      ),
      difficulty: "easy",
      subjectId: gsSubjectId,
      tags: ["history", "modern-india"],
    },
    {
      question: bilingual(
        "The Tropic of Cancer passes through how many Indian states?",
        "கடக ரேகை இந்தியாவின் எத்தனை மாநிலங்கள் வழியாக செல்கிறது?",
      ),
      options: [
        { id: "a", text: bilingual("6", "6") },
        { id: "b", text: bilingual("8", "8") },
        { id: "c", text: bilingual("10", "10") },
        { id: "d", text: bilingual("12", "12") },
      ],
      correctAnswer: "b",
      explanation: bilingual(
        "The Tropic of Cancer passes through 8 Indian states: Gujarat, Rajasthan, Madhya Pradesh, Chhattisgarh, Jharkhand, West Bengal, Tripura, and Mizoram.",
        "கடக ரேகை குஜராத், ராஜஸ்தான், மத்தியப் பிரதேசம், சத்தீஸ்கர், ஜார்க்கண்ட், மேற்கு வங்காளம், திரிபுரா, மிசோரம் ஆகிய 8 மாநிலங்கள் வழியாக செல்கிறது.",
      ),
      difficulty: "hard",
      subjectId: gsSubjectId,
      tags: ["geography"],
    },
    {
      question: bilingual("Which is the state capital of Tamil Nadu?", "தமிழ்நாட்டின் தலைநகரம் எது?"),
      options: [
        { id: "a", text: bilingual("Madurai", "மதுரை") },
        { id: "b", text: bilingual("Coimbatore", "கோயம்புத்தூர்") },
        { id: "c", text: bilingual("Chennai", "சென்னை") },
        { id: "d", text: bilingual("Salem", "சேலம்") },
      ],
      correctAnswer: "c",
      explanation: bilingual(
        "Chennai, located on the Coromandel Coast, is the capital and largest city of Tamil Nadu.",
        "கோரமண்டல் கடற்கரையில் அமைந்துள்ள சென்னை தமிழ்நாட்டின் தலைநகரமும் மிகப்பெரிய நகரமும் ஆகும்.",
      ),
      difficulty: "easy",
      subjectId: gsSubjectId,
      tags: ["geography", "tamil-nadu"],
    },
    {
      question: bilingual(
        "Which river is known as the 'Ganga of the South'?",
        "'தென்னக கங்கை' என அழைக்கப்படும் ஆறு எது?",
      ),
      options: [
        { id: "a", text: bilingual("Krishna", "கிருஷ்ணா") },
        { id: "b", text: bilingual("Godavari", "கோதாவரி") },
        { id: "c", text: bilingual("Kaveri", "காவிரி") },
        { id: "d", text: bilingual("Tungabhadra", "துங்கபத்திரா") },
      ],
      correctAnswer: "b",
      explanation: bilingual(
        "The Godavari, the second-longest river in India, is called the 'Ganga of the South' (Dakshin Ganga).",
        "இந்தியாவின் இரண்டாவது நீளமான ஆறான கோதாவரி 'தென்னக கங்கை' (தட்சிண கங்கை) என அழைக்கப்படுகிறது.",
      ),
      difficulty: "medium",
      subjectId: gsSubjectId,
      tags: ["geography"],
    },
    {
      question: bilingual("Find the HCF of 24 and 36.", "24 மற்றும் 36 இன் மீ.பொ.வ காண்க."),
      options: [
        { id: "a", text: bilingual("6", "6") },
        { id: "b", text: bilingual("12", "12") },
        { id: "c", text: bilingual("18", "18") },
        { id: "d", text: bilingual("24", "24") },
      ],
      correctAnswer: "b",
      explanation: bilingual(
        "24 = 2^3 x 3, 36 = 2^2 x 3^2. The common factors give HCF = 2^2 x 3 = 12.",
        "24 = 2^3 x 3, 36 = 2^2 x 3^2. பொதுவான காரணிகள் மீ.பொ.வ = 2^2 x 3 = 12 ஐ தருகின்றன.",
      ),
      difficulty: "easy",
      subjectId: aptSubjectId,
      tags: ["aptitude", "number-system"],
    },
    {
      question: bilingual(
        "The LCM of two numbers is 120 and their HCF is 10. If one number is 20, find the other.",
        "இரு எண்களின் மீ.பொ.மடங்கு 120, மீ.பொ.வ 10. ஒரு எண் 20 எனில் மற்றொன்றைக் காண்க.",
      ),
      options: [
        { id: "a", text: bilingual("40", "40") },
        { id: "b", text: bilingual("50", "50") },
        { id: "c", text: bilingual("60", "60") },
        { id: "d", text: bilingual("80", "80") },
      ],
      correctAnswer: "c",
      explanation: bilingual(
        "Product of two numbers = LCM x HCF = 120 x 10 = 1200. Other number = 1200 / 20 = 60.",
        "இரு எண்களின் பெருக்கல் = மீ.பொ.ம x மீ.பொ.வ = 120 x 10 = 1200. மற்ற எண் = 1200 / 20 = 60.",
      ),
      difficulty: "medium",
      subjectId: aptSubjectId,
      tags: ["aptitude", "number-system"],
    },
    {
      question: bilingual(
        "A number is increased by 20% and then decreased by 20%. What is the net change?",
        "ஒரு எண் 20% அதிகரிக்கப்பட்டு பின்னர் 20% குறைக்கப்படுகிறது. நிகர மாற்றம் என்ன?",
      ),
      options: [
        { id: "a", text: bilingual("No change", "மாற்றம் இல்லை") },
        { id: "b", text: bilingual("4% decrease", "4% குறைவு") },
        { id: "c", text: bilingual("4% increase", "4% அதிகரிப்பு") },
        { id: "d", text: bilingual("2% decrease", "2% குறைவு") },
      ],
      correctAnswer: "b",
      explanation: bilingual(
        "Net change = -(x^2/100)% for successive x% increase and x% decrease = -(400/100)% = -4%, i.e. a 4% decrease.",
        "தொடர்ச்சியான x% அதிகரிப்பு மற்றும் x% குறைவுக்கான நிகர மாற்றம் = -(x^2/100)% = -(400/100)% = -4%, அதாவது 4% குறைவு.",
      ),
      difficulty: "medium",
      subjectId: aptSubjectId,
      tags: ["aptitude", "percentage"],
    },
    {
      question: bilingual(
        "If 20% of a number is 50, what is the number?",
        "ஒரு எண்ணின் 20% என்பது 50 எனில், அந்த எண் என்ன?",
      ),
      options: [
        { id: "a", text: bilingual("200", "200") },
        { id: "b", text: bilingual("250", "250") },
        { id: "c", text: bilingual("300", "300") },
        { id: "d", text: bilingual("100", "100") },
      ],
      correctAnswer: "b",
      explanation: bilingual("20% x n = 50, so n = 50 x 100 / 20 = 250.", "20% x n = 50, எனவே n = 50 x 100 / 20 = 250."),
      difficulty: "easy",
      subjectId: aptSubjectId,
      tags: ["aptitude", "percentage"],
    },
    {
      question: bilingual(
        "A is the son of B. B is the daughter of C. How is A related to C?",
        "A என்பவர் B இன் மகன். B என்பவர் C இன் மகள். A, C உடன் எவ்வாறு தொடர்புடையவர்?",
      ),
      options: [
        { id: "a", text: bilingual("Grandson", "பேரன்") },
        { id: "b", text: bilingual("Son", "மகன்") },
        { id: "c", text: bilingual("Nephew", "மருமகன்") },
        { id: "d", text: bilingual("Brother", "சகோதரன்") },
      ],
      correctAnswer: "a",
      explanation: bilingual(
        "B is C's daughter and A is B's son, so A is C's grandson.",
        "B என்பவர் C இன் மகள், A என்பவர் B இன் மகன், எனவே A, C இன் பேரன் ஆவார்.",
      ),
      difficulty: "medium",
      subjectId: aptSubjectId,
      tags: ["reasoning", "blood-relations"],
    },
    {
      question: bilingual(
        "Pointing to a photo, Raj said, 'She is the daughter of my grandfather's only son.' How is the girl related to Raj?",
        "ஒரு புகைப்படத்தை சுட்டிக்காட்டி ராஜ் கூறினார், 'அவள் என் தாத்தாவின் ஒரே மகனின் மகள்.' அந்தப் பெண் ராஜுடன் எவ்வாறு தொடர்புடையவள்?",
      ),
      options: [
        { id: "a", text: bilingual("Sister", "சகோதரி") },
        { id: "b", text: bilingual("Cousin", "உறவினர்") },
        { id: "c", text: bilingual("Mother", "தாய்") },
        { id: "d", text: bilingual("Aunt", "அத்தை") },
      ],
      correctAnswer: "a",
      explanation: bilingual(
        "Grandfather's only son is Raj's father, so the girl is Raj's father's daughter — his sister.",
        "தாத்தாவின் ஒரே மகன் ராஜின் தந்தை, எனவே அந்தப் பெண் ராஜின் தந்தையின் மகள் — அவருடைய சகோதரி.",
      ),
      difficulty: "medium",
      subjectId: aptSubjectId,
      tags: ["reasoning", "blood-relations"],
    },
    {
      question: bilingual(
        "Five friends are sitting in a row. P is to the immediate right of Q. R is to the immediate left of S. If the order is Q, P, R, S, T, who is in the middle?",
        "ஐந்து நண்பர்கள் ஒரு வரிசையில் அமர்ந்துள்ளனர். Q, P, R, S, T என்ற வரிசையில் இருந்தால் நடுவில் யார் உள்ளனர்?",
      ),
      options: [
        { id: "a", text: bilingual("Q", "Q") },
        { id: "b", text: bilingual("P", "P") },
        { id: "c", text: bilingual("R", "R") },
        { id: "d", text: bilingual("S", "S") },
      ],
      correctAnswer: "c",
      explanation: bilingual(
        "In the row Q, P, R, S, T the third (middle) position is occupied by R.",
        "Q, P, R, S, T என்ற வரிசையில் மூன்றாவது (நடு) இடத்தில் R உள்ளார்.",
      ),
      difficulty: "easy",
      subjectId: aptSubjectId,
      tags: ["reasoning", "seating-arrangement"],
    },
    {
      question: bilingual(
        "Six people sit around a circular table facing the centre. If A is opposite D, and B is to the right of A, where is B relative to D?",
        "ஆறு பேர் மையத்தை நோக்கி வட்ட மேசையைச் சுற்றி அமர்ந்துள்ளனர். A, D க்கு எதிரே இருந்தால், B, A இன் வலதுபுறம் இருந்தால், B, D உடன் எவ்வாறு உள்ளார்?",
      ),
      options: [
        { id: "a", text: bilingual("To the left of D", "D இன் இடதுபுறம்") },
        { id: "b", text: bilingual("To the right of D", "D இன் வலதுபுறம்") },
        { id: "c", text: bilingual("Opposite D", "D க்கு எதிரே") },
        { id: "d", text: bilingual("Next to D", "D அருகில்") },
      ],
      correctAnswer: "a",
      explanation: bilingual(
        "If A is opposite D and B sits to A's right, then going around the circle B ends up to D's left.",
        "A, D க்கு எதிரே இருந்து B, A இன் வலதுபுறம் அமர்ந்தால், வட்டத்தில் B, D இன் இடதுபுறம் அமைவார்.",
      ),
      difficulty: "hard",
      subjectId: aptSubjectId,
      tags: ["reasoning", "seating-arrangement"],
    },
    {
      question: bilingual("Who wrote India's national anthem?", "இந்தியாவின் தேசிய கீதத்தை இயற்றியவர் யார்?"),
      options: [
        { id: "a", text: bilingual("Rabindranath Tagore", "ரவீந்திரநாத் தாகூர்") },
        { id: "b", text: bilingual("Bankim Chandra Chatterjee", "பங்கிம் சந்திர சட்டர்ஜி") },
        { id: "c", text: bilingual("Sarojini Naidu", "சரோஜினி நாயுடு") },
        { id: "d", text: bilingual("Muhammad Iqbal", "முகமது இக்பால்") },
      ],
      correctAnswer: "a",
      explanation: bilingual(
        "Rabindranath Tagore's 'Jana Gana Mana' was adopted as India's national anthem in 1950.",
        "ரவீந்திரநாத் தாகூர் இயற்றிய 'ஜன கண மன' 1950 ஆம் ஆண்டு இந்தியாவின் தேசிய கீதமாக ஏற்றுக்கொள்ளப்பட்டது.",
      ),
      difficulty: "easy",
      subjectId: gsSubjectId,
      tags: ["general-knowledge"],
    },
    {
      question: bilingual(
        "The Indian Constitution came into force on which date?",
        "இந்திய அரசியலமைப்பு எந்த தேதியில் அமலுக்கு வந்தது?",
      ),
      options: [
        { id: "a", text: bilingual("15 August 1947", "15 ஆகஸ்ட் 1947") },
        { id: "b", text: bilingual("26 January 1950", "26 ஜனவரி 1950") },
        { id: "c", text: bilingual("26 November 1949", "26 நவம்பர் 1949") },
        { id: "d", text: bilingual("26 January 1952", "26 ஜனவரி 1952") },
      ],
      correctAnswer: "b",
      explanation: bilingual(
        "The Constitution was adopted on 26 November 1949 and came into force on 26 January 1950.",
        "அரசியலமைப்பு 26 நவம்பர் 1949 அன்று ஏற்றுக்கொள்ளப்பட்டு, 26 ஜனவரி 1950 அன்று அமலுக்கு வந்தது.",
      ),
      difficulty: "medium",
      subjectId: gsSubjectId,
      tags: ["polity"],
    },
    {
      question: bilingual(
        "Which is the largest state in India by area?",
        "பரப்பளவில் இந்தியாவின் மிகப்பெரிய மாநிலம் எது?",
      ),
      options: [
        { id: "a", text: bilingual("Madhya Pradesh", "மத்தியப் பிரதேசம்") },
        { id: "b", text: bilingual("Maharashtra", "மகாராஷ்டிரா") },
        { id: "c", text: bilingual("Rajasthan", "ராஜஸ்தான்") },
        { id: "d", text: bilingual("Uttar Pradesh", "உத்தரப் பிரதேசம்") },
      ],
      correctAnswer: "c",
      explanation: bilingual(
        "Rajasthan is India's largest state by area, covering about 342,239 sq km.",
        "ராஜஸ்தான் சுமார் 342,239 சதுர கி.மீ பரப்பளவைக் கொண்ட இந்தியாவின் மிகப்பெரிய மாநிலமாகும்.",
      ),
      difficulty: "easy",
      subjectId: gsSubjectId,
      tags: ["geography"],
    },
    {
      question: bilingual(
        "Solve for x: 2x + 5 = 15.",
        "x ஐக் காண்க: 2x + 5 = 15.",
      ),
      options: [
        { id: "a", text: bilingual("x = 5", "x = 5") },
        { id: "b", text: bilingual("x = 10", "x = 10") },
        { id: "c", text: bilingual("x = 7.5", "x = 7.5") },
        { id: "d", text: bilingual("x = 4", "x = 4") },
      ],
      correctAnswer: "a",
      explanation: bilingual("2x + 5 = 15 -> 2x = 10 -> x = 5.", "2x + 5 = 15 -> 2x = 10 -> x = 5."),
      difficulty: "easy",
      subjectId: aptSubjectId,
      tags: ["aptitude", "algebra"],
    },
    {
      question: bilingual(
        "A train 100 m long crosses a pole in 10 seconds. What is its speed?",
        "100 மீ நீளமுள்ள ரயில் ஒரு கம்பத்தை 10 வினாடிகளில் கடக்கிறது. அதன் வேகம் என்ன?",
      ),
      options: [
        { id: "a", text: bilingual("10 m/s", "10 மீ/வி") },
        { id: "b", text: bilingual("36 km/h", "36 கி.மீ/மணி") },
        { id: "c", text: bilingual("Both A and B", "A மற்றும் B இரண்டும்") },
        { id: "d", text: bilingual("100 m/s", "100 மீ/வி") },
      ],
      correctAnswer: "c",
      explanation: bilingual(
        "Speed = distance / time = 100 / 10 = 10 m/s, which equals 10 x 18/5 = 36 km/h.",
        "வேகம் = தூரம் / நேரம் = 100 / 10 = 10 மீ/வி, இது 10 x 18/5 = 36 கி.மீ/மணி ஆகும்.",
      ),
      difficulty: "medium",
      subjectId: aptSubjectId,
      tags: ["aptitude", "speed-time-distance"],
    },
  ];

  const questionDocs = questionPlan.map((q) => ({
    _id: oid(),
    type: "mcq_single",
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    difficulty: q.difficulty,
    subjectId: q.subjectId,
    tags: q.tags,
    status: "published",
    createdAt: now,
    updatedAt: now,
  }));
  await db.collection("questions").insertMany(questionDocs);
  console.log(`Seeded ${questionDocs.length} bilingual questions.`);

  // ---- 9 tests, each drawing a rotating 10-question window from the pool ----
  const poolSize = questionDocs.length;
  const perTest = 10;
  const testDocs = [];
  for (let i = 0; i < 9; i++) {
    const picked = [];
    for (let k = 0; k < perTest; k++) {
      picked.push(questionDocs[(i * 3 + k) % poolSize]);
    }
    testDocs.push({
      _id: oid(),
      title: `TNPSC Group 4 Mock Test ${i + 1}`,
      titleTa: `TNPSC குரூப் 4 மாதிரித் தேர்வு ${i + 1}`,
      testSeriesId: seriesId,
      durationSeconds: 900,
      negativeMarking: true,
      defaultNegativeMarks: 0.25,
      shuffleQuestions: false,
      shuffleOptions: true,
      opensAt: null,
      closesAt: null,
      status: "published",
      questions: picked.map((q, idx) => ({
        questionId: q._id,
        order: idx + 1,
        marks: 1,
        negativeMarks: 0.25,
      })),
      createdAt: now,
      updatedAt: now,
    });
  }
  await db.collection("tests").insertMany(testDocs);
  console.log(`Seeded ${testDocs.length} tests inside "TNPSC Group 4 Full Length Mock Test".`);

  await client.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
