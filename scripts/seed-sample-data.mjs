// Usage: npm run seed:sample
// Populates the database with sample syllabus, exam, test-series, question,
// test, and student data for local development / demos. Safe to re-run —
// every write is an upsert keyed on the same unique fields the app itself
// enforces, so existing records are updated in place rather than duplicated.
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const { Schema } = mongoose;

const statusActiveInactive = {
  type: String,
  enum: ["active", "inactive"],
  default: "active",
};

const Board = mongoose.model(
  "Board",
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      nameTa: { type: String, trim: true, default: "" },
      slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
      status: statusActiveInactive,
    },
    { timestamps: true },
  ),
);

const Subject = mongoose.model(
  "Subject",
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      nameTa: { type: String, trim: true, default: "" },
      slug: { type: String, required: true, trim: true, lowercase: true },
      boardId: { type: Schema.Types.ObjectId, ref: "Board", required: true },
      status: statusActiveInactive,
    },
    { timestamps: true },
  ),
);

const ExamCategory = mongoose.model(
  "ExamCategory",
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      nameTa: { type: String, trim: true, default: "" },
      slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
      status: statusActiveInactive,
      sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true },
  ),
);

const Exam = mongoose.model(
  "Exam",
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      nameTa: { type: String, trim: true, default: "" },
      slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
      examCategoryId: { type: Schema.Types.ObjectId, ref: "ExamCategory", required: true },
      description: { type: String, trim: true, default: "" },
      descriptionTa: { type: String, trim: true, default: "" },
      status: statusActiveInactive,
    },
    { timestamps: true },
  ),
);

const TestSeries = mongoose.model(
  "TestSeries",
  new Schema(
    {
      title: { type: String, required: true, trim: true },
      titleTa: { type: String, trim: true, default: "" },
      slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
      examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
      description: { type: String, trim: true, default: "" },
      descriptionTa: { type: String, trim: true, default: "" },
      access: { type: String, enum: ["free", "paid", "subscription"], default: "free" },
      price: { type: Number, default: 0, min: 0 },
      status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
    },
    { timestamps: true },
  ),
);

const bilingualText = {
  en: { type: String, required: true, trim: true },
  ta: { type: String, trim: true, default: "" },
};

const Question = mongoose.model(
  "Question",
  new Schema(
    {
      type: { type: String, enum: ["mcq_single", "true_false", "integer"], default: "mcq_single" },
      question: { type: bilingualText, required: true, _id: false },
      options: {
        type: [
          new Schema(
            { id: { type: String, required: true }, text: { type: bilingualText, required: true, _id: false } },
            { _id: false },
          ),
        ],
        default: [],
      },
      correctAnswer: { type: String, required: true, trim: true },
      explanation: { type: { en: String, ta: String }, default: () => ({ en: "", ta: "" }), _id: false },
      difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
      subjectId: { type: Schema.Types.ObjectId, ref: "Subject" },
      tags: { type: [String], default: [] },
      status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
    },
    { timestamps: true },
  ),
);

const Test = mongoose.model(
  "Test",
  new Schema(
    {
      title: { type: String, required: true, trim: true },
      titleTa: { type: String, trim: true, default: "" },
      testSeriesId: { type: Schema.Types.ObjectId, ref: "TestSeries", required: true },
      durationSeconds: { type: Number, required: true, default: 3600 },
      negativeMarking: { type: Boolean, default: true },
      defaultNegativeMarks: { type: Number, default: 0.25 },
      shuffleQuestions: { type: Boolean, default: false },
      shuffleOptions: { type: Boolean, default: true },
      status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
      questions: {
        type: [
          new Schema(
            {
              questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
              order: { type: Number, required: true },
              marks: { type: Number, default: 1 },
              negativeMarks: { type: Number, default: 0 },
            },
            { _id: false },
          ),
        ],
        default: [],
      },
    },
    { timestamps: true },
  ),
);

const User = mongoose.model(
  "User",
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash: { type: String, required: true },
      role: { type: String, enum: ["student", "admin"], default: "student", required: true },
      emailVerified: { type: Boolean, default: false },
      status: statusActiveInactive,
    },
    { timestamps: true },
  ),
);

async function upsert(Model, filter, data) {
  return Model.findOneAndUpdate(
    filter,
    { $set: data },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Add it to .env.local before seeding.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME || "careernotification",
  });

  console.log("Connected. Seeding sample data...");

  // ---- Syllabus: boards -> subjects ----
  const syllabusPlan = [
    {
      board: "TNPSC",
      boardTa: "தமிழக அரசுப் பணியாளர் தேர்வாணையம்",
      subjects: [
        { name: "General Studies", nameTa: "பொது அறிவு" },
        { name: "Aptitude & Mental Ability", nameTa: "திறன் மற்றும் மனத்திறன்" },
        { name: "Indian Polity", nameTa: "இந்திய அரசியலமைப்பு" },
      ],
    },
    {
      board: "SSC / Central Govt",
      boardTa: "எஸ்எஸ்சி / மத்திய அரசு",
      subjects: [
        { name: "Quantitative Aptitude", nameTa: "எண் திறன்" },
        { name: "English Language", nameTa: "ஆங்கில மொழி" },
      ],
    },
  ];

  const subjectsBySlug = new Map();

  for (const boardPlan of syllabusPlan) {
    const board = await upsert(
      Board,
      { slug: slugify(boardPlan.board) },
      { name: boardPlan.board, nameTa: boardPlan.boardTa ?? "", slug: slugify(boardPlan.board), status: "active" },
    );

    for (const subjectPlan of boardPlan.subjects) {
      const subjectSlug = slugify(subjectPlan.name);
      const subject = await upsert(
        Subject,
        { boardId: board._id, slug: subjectSlug },
        {
          name: subjectPlan.name,
          nameTa: subjectPlan.nameTa ?? "",
          slug: subjectSlug,
          boardId: board._id,
          status: "active",
        },
      );
      subjectsBySlug.set(subjectSlug, subject);
    }
  }
  console.log(`Syllabus: ${await Board.countDocuments()} boards, ${await Subject.countDocuments()} subjects.`);

  // ---- Exam categories -> exams -> test series ----
  const examPlan = [
    {
      category: "State Government Exams",
      categoryTa: "மாநில அரசு தேர்வுகள்",
      exams: [
        {
          name: "TNPSC Group 4",
          nameTa: "TNPSC குரூப் 4",
          desc: "Village Administrative Officer & allied posts.",
          descTa: "கிராம நிர்வாக அலுவலர் மற்றும் தொடர்புடைய பணியிடங்கள்.",
        },
        {
          name: "TNPSC Group 2",
          nameTa: "TNPSC குரூப் 2",
          desc: "Group 2 non-interview posts under Tamil Nadu government.",
          descTa: "தமிழ்நாடு அரசின் குரூப் 2 நேர்முகத் தேர்வு இல்லாத பணியிடங்கள்.",
        },
        {
          name: "TNPSC Group 3",
          nameTa: "TNPSC குரூப் 3",
          desc: "Group 3 posts under Tamil Nadu government — Tamil-medium question batch.",
          descTa: "தமிழ்நாடு அரசின் குரூப் 3 பணியிடங்கள் — தமிழ் மொழி வினாத்தாள் தொகுப்பு.",
        },
      ],
    },
    {
      category: "Bank Exams",
      categoryTa: "வங்கி தேர்வுகள்",
      exams: [
        {
          name: "IBPS PO",
          nameTa: "IBPS PO",
          desc: "Probationary Officer recruitment across public sector banks.",
          descTa: "பொதுத்துறை வங்கிகளில் பயிற்சி அதிகாரி பணியமர்த்தல்.",
        },
        {
          name: "SBI Clerk",
          nameTa: "SBI கிளார்க்",
          desc: "Junior Associate recruitment for State Bank of India.",
          descTa: "இந்திய ஸ்டேட் வங்கியில் ஜூனியர் அசோசியேட் பணியமர்த்தல்.",
        },
      ],
    },
    {
      category: "Railway Exams",
      categoryTa: "இரயில்வே தேர்வுகள்",
      exams: [
        {
          name: "RRB NTPC",
          nameTa: "RRB NTPC",
          desc: "Non-Technical Popular Categories recruitment.",
          descTa: "தொழில்நுட்பம் சாராத பணியிட வகைகள் பணியமர்த்தல்.",
        },
        {
          name: "RRB Group D",
          nameTa: "RRB குரூப் D",
          desc: "Level 1 posts across Indian Railways.",
          descTa: "இந்திய இரயில்வேயில் நிலை 1 பணியிடங்கள்.",
        },
      ],
    },
  ];

  const examsBySlug = new Map();
  const testSeriesList = [];

  for (let cati = 0; cati < examPlan.length; cati++) {
    const catPlan = examPlan[cati];
    const catSlug = slugify(catPlan.category);
    const category = await upsert(
      ExamCategory,
      { slug: catSlug },
      {
        name: catPlan.category,
        nameTa: catPlan.categoryTa ?? "",
        slug: catSlug,
        status: "active",
        sortOrder: cati,
      },
    );

    for (const examItem of catPlan.exams) {
      const examSlug = slugify(examItem.name);
      const exam = await upsert(
        Exam,
        { slug: examSlug },
        {
          name: examItem.name,
          nameTa: examItem.nameTa ?? "",
          slug: examSlug,
          examCategoryId: category._id,
          description: examItem.desc,
          descriptionTa: examItem.descTa ?? "",
          status: "active",
        },
      );
      examsBySlug.set(examSlug, exam);

      const seriesTitle = `${examItem.name} Full Length Mock Test`;
      const seriesTitleTa = `${examItem.nameTa} முழு நீள மாதிரித் தேர்வு`;
      const seriesSlug = slugify(seriesTitle);
      const access = testSeriesList.length % 3 === 0 ? "free" : "paid";
      const series = await upsert(
        TestSeries,
        { slug: seriesSlug },
        {
          title: seriesTitle,
          titleTa: seriesTitleTa,
          slug: seriesSlug,
          examId: exam._id,
          description: `Full length mock test series for ${examItem.name} aspirants.`,
          descriptionTa: `${examItem.nameTa} தேர்வர்களுக்கான முழு நீள மாதிரித் தேர்வுத் தொடர்.`,
          access,
          price: access === "free" ? 0 : 499,
          status: "published",
        },
      );
      testSeriesList.push({ series, examSlug });
    }
  }
  console.log(
    `Exams: ${await ExamCategory.countDocuments()} categories, ${await Exam.countDocuments()} exams, ${await TestSeries.countDocuments()} test series.`,
  );

  // ---- Sample questions (linked to General Studies syllabus) ----
  const gsSubject = subjectsBySlug.get("general-studies");
  const aptitudeSubject = subjectsBySlug.get("aptitude-mental-ability");
  const politySubject = subjectsBySlug.get("indian-polity");
  const algebraSubject = subjectsBySlug.get("quantitative-aptitude");
  const englishSubject = subjectsBySlug.get("english-language");
  const g3Subject = subjectsBySlug.get("general-studies");

  const questionPlan = [
    {
      question: { en: "Who was the founder of the Maurya Empire?", ta: "மௌரிய பேரரசை நிறுவியவர் யார்?" },
      options: [
        { id: "a", text: { en: "Chandragupta Maurya", ta: "சந்திரகுப்த மௌரியர்" } },
        { id: "b", text: { en: "Ashoka", ta: "அசோகர்" } },
        { id: "c", text: { en: "Bindusara", ta: "பிந்துசாரர்" } },
        { id: "d", text: { en: "Samudragupta", ta: "சமுத்திரகுப்தர்" } },
      ],
      correctAnswer: "a",
      explanation: {
        en: "Chandragupta Maurya founded the Maurya Empire around 322 BCE with the guidance of Chanakya.",
        ta: "சந்திரகுப்த மௌரியர் சாணக்கியரின் வழிகாட்டுதலுடன் கிமு 322 இல் மௌரிய பேரரசை நிறுவினார்.",
      },
      difficulty: "easy",
      subjectId: gsSubject?._id,
      tags: ["history", "ancient-india"],
    },
    {
      question: { en: "Which battle marked the end of the Maratha Empire?", ta: "மராட்டியப் பேரரசின் முடிவைக் குறித்த போர் எது?" },
      options: [
        { id: "a", text: { en: "Battle of Plassey", ta: "பிளாசி போர்" } },
        { id: "b", text: { en: "Third Battle of Panipat", ta: "மூன்றாம் பானிபட் போர்" } },
        { id: "c", text: { en: "Battle of Buxar", ta: "பக்சார் போர்" } },
        { id: "d", text: { en: "Third Anglo-Maratha War", ta: "மூன்றாம் ஆங்கிலோ-மராட்டியப் போர்" } },
      ],
      correctAnswer: "d",
      explanation: {
        en: "The Third Anglo-Maratha War (1817-1818) ended Maratha power and established British paramountcy in India.",
        ta: "மூன்றாம் ஆங்கிலோ-மராட்டியப் போர் (1817-1818) மராட்டிய ஆட்சியை முடிவுக்குக் கொண்டுவந்து இந்தியாவில் ஆங்கிலேயர் மேலாதிக்கத்தை நிலைநாட்டியது.",
      },
      difficulty: "medium",
      subjectId: gsSubject?._id,
      tags: ["history", "modern-india"],
    },
    {
      question: { en: "Find the HCF of 24 and 36.", ta: "24 மற்றும் 36 இன் மீ.பொ.வ காண்க." },
      options: [
        { id: "a", text: { en: "6", ta: "6" } },
        { id: "b", text: { en: "12", ta: "12" } },
        { id: "c", text: { en: "18", ta: "18" } },
        { id: "d", text: { en: "24", ta: "24" } },
      ],
      correctAnswer: "b",
      explanation: {
        en: "24 = 2^3 x 3, 36 = 2^2 x 3^2. The common factors give HCF = 2^2 x 3 = 12.",
        ta: "24 = 2^3 x 3, 36 = 2^2 x 3^2. பொதுவான காரணிகள் மீ.பொ.வ = 2^2 x 3 = 12 ஐ தருகின்றன.",
      },
      difficulty: "easy",
      subjectId: aptitudeSubject?._id,
      tags: ["aptitude", "number-system"],
    },
    {
      question: { en: "The LCM of two numbers is 120 and their HCF is 10. If one number is 20, find the other.", ta: "இரு எண்களின் மீ.பொ.மடங்கு 120, மீ.பொ.வ 10. ஒரு எண் 20 எனில் மற்றொன்றைக் காண்க." },
      options: [
        { id: "a", text: { en: "40", ta: "40" } },
        { id: "b", text: { en: "50", ta: "50" } },
        { id: "c", text: { en: "60", ta: "60" } },
        { id: "d", text: { en: "80", ta: "80" } },
      ],
      correctAnswer: "c",
      explanation: {
        en: "Product of two numbers = LCM x HCF = 120 x 10 = 1200. Other number = 1200 / 20 = 60.",
        ta: "இரு எண்களின் பெருக்கல் = மீ.பொ.ம x மீ.பொ.வ = 120 x 10 = 1200. மற்ற எண் = 1200 / 20 = 60.",
      },
      difficulty: "medium",
      subjectId: aptitudeSubject?._id,
      tags: ["aptitude", "number-system"],
    },
    {
      question: { en: "The Tropic of Cancer passes through how many Indian states?", ta: "கடக ரேகை இந்தியாவின் எத்தனை மாநிலங்கள் வழியாக செல்கிறது?" },
      options: [
        { id: "a", text: { en: "6", ta: "6" } },
        { id: "b", text: { en: "8", ta: "8" } },
        { id: "c", text: { en: "10", ta: "10" } },
        { id: "d", text: { en: "12", ta: "12" } },
      ],
      correctAnswer: "b",
      explanation: {
        en: "The Tropic of Cancer passes through 8 Indian states: Gujarat, Rajasthan, Madhya Pradesh, Chhattisgarh, Jharkhand, West Bengal, Tripura, and Mizoram.",
        ta: "கடக ரேகை குஜராத், ராஜஸ்தான், மத்தியப் பிரதேசம், சத்தீஸ்கர், ஜார்க்கண்ட், மேற்கு வங்காளம், திரிபுரா, மிசோரம் ஆகிய 8 மாநிலங்கள் வழியாக செல்கிறது.",
      },
      difficulty: "hard",
      subjectId: gsSubject?._id,
      tags: ["geography"],
    },
    {
      question: { en: "Which is the state capital of Tamil Nadu?", ta: "தமிழ்நாட்டின் தலைநகரம் எது?" },
      options: [
        { id: "a", text: { en: "Madurai", ta: "மதுரை" } },
        { id: "b", text: { en: "Coimbatore", ta: "கோயம்புத்தூர்" } },
        { id: "c", text: { en: "Chennai", ta: "சென்னை" } },
        { id: "d", text: { en: "Salem", ta: "சேலம்" } },
      ],
      correctAnswer: "c",
      explanation: {
        en: "Chennai, located on the Coromandel Coast, is the capital and largest city of Tamil Nadu.",
        ta: "கோரமண்டல் கடற்கரையில் அமைந்துள்ள சென்னை தமிழ்நாட்டின் தலைநகரமும் மிகப்பெரிய நகரமும் ஆகும்.",
      },
      difficulty: "easy",
      subjectId: gsSubject?._id,
      tags: ["geography", "tamil-nadu"],
    },
    {
      question: { en: "A is the son of B. B is the daughter of C. How is A related to C?", ta: "A என்பவர் B இன் மகன். B என்பவர் C இன் மகள். A, C உடன் எவ்வாறு தொடர்புடையவர்?" },
      options: [
        { id: "a", text: { en: "Grandson", ta: "பேரன்" } },
        { id: "b", text: { en: "Son", ta: "மகன்" } },
        { id: "c", text: { en: "Nephew", ta: "மருமகன்" } },
        { id: "d", text: { en: "Brother", ta: "சகோதரன்" } },
      ],
      correctAnswer: "a",
      explanation: {
        en: "B is C's daughter and A is B's son, so A is C's grandson.",
        ta: "B என்பவர் C இன் மகள், A என்பவர் B இன் மகன், எனவே A, C இன் பேரன் ஆவார்.",
      },
      difficulty: "medium",
      subjectId: aptitudeSubject?._id,
      tags: ["reasoning", "blood-relations"],
    },
    {
      question: { en: "Five friends are sitting in a row. P is to the immediate right of Q. R is to the immediate left of S. Who is in the middle if the order is Q, P, R, S, T?", ta: "ஐந்து நண்பர்கள் ஒரு வரிசையில் அமர்ந்துள்ளனர். Q, P, R, S, T என்ற வரிசையில் இருந்தால் நடுவில் யார் உள்ளனர்?" },
      options: [
        { id: "a", text: { en: "Q", ta: "Q" } },
        { id: "b", text: { en: "P", ta: "P" } },
        { id: "c", text: { en: "R", ta: "R" } },
        { id: "d", text: { en: "S", ta: "S" } },
      ],
      correctAnswer: "c",
      explanation: {
        en: "In the row Q, P, R, S, T the third (middle) position is occupied by R.",
        ta: "Q, P, R, S, T என்ற வரிசையில் மூன்றாவது (நடு) இடத்தில் R உள்ளார்.",
      },
      difficulty: "easy",
      subjectId: aptitudeSubject?._id,
      tags: ["reasoning", "seating-arrangement"],
    },
    {
      question: { en: "Which Fundamental Right abolished untouchability in India?", ta: "இந்தியாவில் தீண்டாமையை ஒழித்த அடிப்படை உரிமை எது?" },
      options: [
        { id: "a", text: { en: "Right to Equality", ta: "சமத்துவ உரிமை" } },
        { id: "b", text: { en: "Right to Freedom", ta: "சுதந்திர உரிமை" } },
        { id: "c", text: { en: "Right against Exploitation", ta: "சுரண்டலுக்கு எதிரான உரிமை" } },
        { id: "d", text: { en: "Right to Constitutional Remedies", ta: "அரசியலமைப்பு பரிகார உரிமை" } },
      ],
      correctAnswer: "a",
      explanation: {
        en: "Article 17, under the Right to Equality, abolishes untouchability and forbids its practice in any form.",
        ta: "சமத்துவ உரிமையின் கீழ் வரும் பிரிவு 17, தீண்டாமையை ஒழித்து அதன் எந்த வடிவிலான நடைமுறையையும் தடை செய்கிறது.",
      },
      difficulty: "medium",
      subjectId: politySubject?._id,
      tags: ["polity", "fundamental-rights"],
    },
    {
      question: { en: "The Directive Principles of State Policy are enshrined in which part of the Indian Constitution?", ta: "இந்திய அரசியலமைப்பின் எந்தப் பகுதியில் அரசுக் கொள்கை வழிகாட்டு நெறிமுறைகள் உள்ளன?" },
      options: [
        { id: "a", text: { en: "Part III", ta: "பகுதி III" } },
        { id: "b", text: { en: "Part IV", ta: "பகுதி IV" } },
        { id: "c", text: { en: "Part V", ta: "பகுதி V" } },
        { id: "d", text: { en: "Part II", ta: "பகுதி II" } },
      ],
      correctAnswer: "b",
      explanation: {
        en: "Part IV (Articles 36-51) of the Constitution contains the Directive Principles of State Policy.",
        ta: "அரசியலமைப்பின் பகுதி IV (பிரிவுகள் 36-51) அரசுக் கொள்கை வழிகாட்டு நெறிமுறைகளைக் கொண்டுள்ளது.",
      },
      difficulty: "medium",
      subjectId: politySubject?._id,
      tags: ["polity", "directive-principles"],
    },
    {
      question: { en: "Solve for x: 2x + 5 = 15.", ta: "x ஐக் காண்க: 2x + 5 = 15." },
      options: [
        { id: "a", text: { en: "x = 5", ta: "x = 5" } },
        { id: "b", text: { en: "x = 10", ta: "x = 10" } },
        { id: "c", text: { en: "x = 7.5", ta: "x = 7.5" } },
        { id: "d", text: { en: "x = 4", ta: "x = 4" } },
      ],
      correctAnswer: "a",
      explanation: {
        en: "2x + 5 = 15 → 2x = 10 → x = 5.",
        ta: "2x + 5 = 15 → 2x = 10 → x = 5.",
      },
      difficulty: "easy",
      subjectId: algebraSubject?._id,
      tags: ["algebra", "linear-equations"],
    },
    {
      question: { en: "Find the roots of x^2 - 5x + 6 = 0.", ta: "x^2 - 5x + 6 = 0 இன் மூலங்களைக் காண்க." },
      options: [
        { id: "a", text: { en: "2, 3", ta: "2, 3" } },
        { id: "b", text: { en: "1, 6", ta: "1, 6" } },
        { id: "c", text: { en: "-2, -3", ta: "-2, -3" } },
        { id: "d", text: { en: "2, -3", ta: "2, -3" } },
      ],
      correctAnswer: "a",
      explanation: {
        en: "x^2 - 5x + 6 = (x - 2)(x - 3) = 0, so x = 2 or x = 3.",
        ta: "x^2 - 5x + 6 = (x - 2)(x - 3) = 0, எனவே x = 2 அல்லது x = 3.",
      },
      difficulty: "medium",
      subjectId: algebraSubject?._id,
      tags: ["algebra", "quadratic-equations"],
    },
    {
      question: { en: "Choose the correct tense: \"She ___ to the market every day.\"", ta: "சரியான காலத்தைத் தேர்ந்தெடுக்கவும்: \"She ___ to the market every day.\"" },
      options: [
        { id: "a", text: { en: "go", ta: "go" } },
        { id: "b", text: { en: "goes", ta: "goes" } },
        { id: "c", text: { en: "going", ta: "going" } },
        { id: "d", text: { en: "gone", ta: "gone" } },
      ],
      correctAnswer: "b",
      explanation: {
        en: "With a third-person singular subject (\"She\") in the simple present tense, the verb takes an -s/-es ending: \"goes\".",
        ta: "மூன்றாம் நபர் ஒருமை எழுவாய் (\"She\") உடன் simple present tense இல் வினைச்சொல் -s/-es விகுதி பெறும்: \"goes\".",
      },
      difficulty: "easy",
      subjectId: englishSubject?._id,
      tags: ["english", "tenses"],
    },
    {
      question: { en: "Convert to passive voice: \"The teacher teaches the students.\"", ta: "செயப்படுவினையாக மாற்றவும்: \"The teacher teaches the students.\"" },
      options: [
        { id: "a", text: { en: "The students are taught by the teacher.", ta: "The students are taught by the teacher." } },
        { id: "b", text: { en: "The students taught the teacher.", ta: "The students taught the teacher." } },
        { id: "c", text: { en: "The teacher was taught by the students.", ta: "The teacher was taught by the students." } },
        { id: "d", text: { en: "The students were teaching the teacher.", ta: "The students were teaching the teacher." } },
      ],
      correctAnswer: "a",
      explanation: {
        en: "In passive voice, the object of the active sentence (\"the students\") becomes the subject, giving \"The students are taught by the teacher.\"",
        ta: "செயப்படுவினையில், செய்வினை வாக்கியத்தின் செயப்படுபொருள் (\"the students\") எழுவாயாக மாறும்: \"The students are taught by the teacher.\"",
      },
      difficulty: "medium",
      subjectId: englishSubject?._id,
      tags: ["english", "active-passive-voice"],
    },
  ];

  // ---- TNPSC Group 3 batch: Tamil-only questions ----
  // The Question schema requires an `en` field, but nothing requires it to be
  // English text — for this Tamil-medium batch `en` and `ta` hold the identical
  // Tamil string, so the question is genuinely Tamil-only wherever it's rendered.
  const tamilOnly = (text) => ({ en: text, ta: text });
  const g3QuestionPlan = [
    {
      question: tamilOnly("இந்தியாவின் தேசிய கீதத்தை இயற்றியவர் யார்?"),
      options: [
        { id: "a", text: tamilOnly("ரவீந்திரநாத் தாகூர்") },
        { id: "b", text: tamilOnly("பங்கிம் சந்திர சட்டர்ஜி") },
        { id: "c", text: tamilOnly("சரோஜினி நாயுடு") },
        { id: "d", text: tamilOnly("முகமது இக்பால்") },
      ],
      correctAnswer: "a",
      explanation: tamilOnly(
        "ரவீந்திரநாத் தாகூர் இயற்றிய \"ஜன கண மன\" 1950 ஆம் ஆண்டு இந்தியாவின் தேசிய கீதமாக ஏற்றுக்கொள்ளப்பட்டது.",
      ),
      difficulty: "easy",
      subjectId: g3Subject?._id,
      tags: ["tnpsc-g3", "national-symbols"],
    },
    {
      question: tamilOnly("இந்திய அரசியலமைப்பு எந்த ஆண்டு அமலுக்கு வந்தது?"),
      options: [
        { id: "a", text: tamilOnly("15 ஆகஸ்ட் 1947") },
        { id: "b", text: tamilOnly("26 ஜனவரி 1950") },
        { id: "c", text: tamilOnly("26 நவம்பர் 1949") },
        { id: "d", text: tamilOnly("26 ஜனவரி 1952") },
      ],
      correctAnswer: "b",
      explanation: tamilOnly(
        "இந்திய அரசியலமைப்பு 26 நவம்பர் 1949 அன்று ஏற்றுக்கொள்ளப்பட்டு, 26 ஜனவரி 1950 அன்று அமலுக்கு வந்தது.",
      ),
      difficulty: "medium",
      subjectId: g3Subject?._id,
      tags: ["tnpsc-g3", "polity"],
    },
    {
      question: tamilOnly("\"மகாத்மா\" என்ற பட்டத்தை காந்திஜிக்கு வழங்கியவர் யார் என நம்பப்படுகிறது?"),
      options: [
        { id: "a", text: tamilOnly("ரவீந்திரநாத் தாகூர்") },
        { id: "b", text: tamilOnly("ஜவகர்லால் நேரு") },
        { id: "c", text: tamilOnly("சுபாஷ் சந்திரபோஸ்") },
        { id: "d", text: tamilOnly("வல்லபாய் படேல்") },
      ],
      correctAnswer: "a",
      explanation: tamilOnly("ரவீந்திரநாத் தாகூர் காந்திஜிக்கு \"மகாத்மா\" என்ற பட்டத்தை வழங்கினார் என நம்பப்படுகிறது."),
      difficulty: "medium",
      subjectId: g3Subject?._id,
      tags: ["tnpsc-g3", "national-symbols"],
    },
    {
      question: tamilOnly("இந்திய தேசியக் கொடியில் உள்ள சக்கரத்தின் பெயர் என்ன?"),
      options: [
        { id: "a", text: tamilOnly("அசோக சக்கரம்") },
        { id: "b", text: tamilOnly("தேசிய சக்கரம்") },
        { id: "c", text: tamilOnly("ராஜ சக்கரம்") },
        { id: "d", text: tamilOnly("சூரிய சக்கரம்") },
      ],
      correctAnswer: "a",
      explanation: tamilOnly(
        "இந்திய தேசியக் கொடியின் நடுவில் உள்ள சக்கரம் \"அசோக சக்கரம்\" எனப்படும், இதில் 24 ஆரங்கள் உள்ளன.",
      ),
      difficulty: "easy",
      subjectId: g3Subject?._id,
      tags: ["tnpsc-g3", "national-symbols"],
    },
    {
      question: tamilOnly("உலகின் மிக நீளமான ஆறு எது?"),
      options: [
        { id: "a", text: tamilOnly("நைல்") },
        { id: "b", text: tamilOnly("அமேசான்") },
        { id: "c", text: tamilOnly("கங்கை") },
        { id: "d", text: tamilOnly("யாங்சி") },
      ],
      correctAnswer: "a",
      explanation: tamilOnly(
        "நைல் ஆறு ஆப்பிரிக்காவில் அமைந்துள்ளது, சுமார் 6,650 கி.மீ நீளம் கொண்டு உலகின் மிக நீளமான ஆறாக கருதப்படுகிறது.",
      ),
      difficulty: "easy",
      subjectId: g3Subject?._id,
      tags: ["tnpsc-g3", "geography"],
    },
    {
      question: tamilOnly("மனித உடலில் உள்ள மிகப்பெரிய உறுப்பு எது?"),
      options: [
        { id: "a", text: tamilOnly("இதயம்") },
        { id: "b", text: tamilOnly("சிறுநீரகம்") },
        { id: "c", text: tamilOnly("தோல்") },
        { id: "d", text: tamilOnly("கல்லீரல்") },
      ],
      correctAnswer: "c",
      explanation: tamilOnly("தோல் மனித உடலின் மிகப்பெரிய உறுப்பாகும், இது உடலைப் பாதுகாக்கும் வெளிப்புற அடுக்காக செயல்படுகிறது."),
      difficulty: "easy",
      subjectId: g3Subject?._id,
      tags: ["tnpsc-g3", "science"],
    },
    {
      question: tamilOnly("சூரியனுக்கு மிக அருகில் உள்ள கோள் எது?"),
      options: [
        { id: "a", text: tamilOnly("புதன்") },
        { id: "b", text: tamilOnly("வெள்ளி") },
        { id: "c", text: tamilOnly("செவ்வாய்") },
        { id: "d", text: tamilOnly("பூமி") },
      ],
      correctAnswer: "a",
      explanation: tamilOnly("புதன் கோள் சூரியனுக்கு மிக அருகில் உள்ள கோளாகும்."),
      difficulty: "easy",
      subjectId: g3Subject?._id,
      tags: ["tnpsc-g3", "science"],
    },
    {
      question: tamilOnly("15 மற்றும் 20 இன் மீ.பொ.ம (LCM) என்ன?"),
      options: [
        { id: "a", text: tamilOnly("30") },
        { id: "b", text: tamilOnly("45") },
        { id: "c", text: tamilOnly("60") },
        { id: "d", text: tamilOnly("75") },
      ],
      correctAnswer: "c",
      explanation: tamilOnly("15 = 3×5, 20 = 2²×5. மீ.பொ.ம = 2²×3×5 = 60."),
      difficulty: "medium",
      subjectId: g3Subject?._id,
      tags: ["tnpsc-g3", "aptitude"],
    },
    {
      question: tamilOnly("ஒரு எண்ணின் 20% என்பது 50 எனில், அந்த எண் என்ன?"),
      options: [
        { id: "a", text: tamilOnly("200") },
        { id: "b", text: tamilOnly("250") },
        { id: "c", text: tamilOnly("300") },
        { id: "d", text: tamilOnly("100") },
      ],
      correctAnswer: "b",
      explanation: tamilOnly("20% × x = 50 ⟹ x = 50 × 100 / 20 = 250."),
      difficulty: "medium",
      subjectId: g3Subject?._id,
      tags: ["tnpsc-g3", "aptitude"],
    },
    {
      question: tamilOnly("ஒரு செவ்வகத்தின் நீளம் 12 செ.மீ, அகலம் 5 செ.மீ எனில் அதன் பரப்பளவு என்ன?"),
      options: [
        { id: "a", text: tamilOnly("17 சதுர செ.மீ") },
        { id: "b", text: tamilOnly("34 சதுர செ.மீ") },
        { id: "c", text: tamilOnly("60 சதுர செ.மீ") },
        { id: "d", text: tamilOnly("70 சதுர செ.மீ") },
      ],
      correctAnswer: "c",
      explanation: tamilOnly("பரப்பளவு = நீளம் × அகலம் = 12 × 5 = 60 சதுர செ.மீ."),
      difficulty: "easy",
      subjectId: g3Subject?._id,
      tags: ["tnpsc-g3", "aptitude"],
    },
  ];

  const seededQuestions = [];
  for (const q of questionPlan) {
    const doc = await upsert(
      Question,
      { "question.en": q.question.en },
      { ...q, type: "mcq_single", status: "published" },
    );
    seededQuestions.push(doc);
  }

  const seededG3Questions = [];
  for (const q of g3QuestionPlan) {
    const doc = await upsert(
      Question,
      { "question.en": q.question.en },
      { ...q, type: "mcq_single", status: "published" },
    );
    seededG3Questions.push(doc);
  }
  console.log(`Questions: ${await Question.countDocuments()} total.`);

  // ---- Tests (one per test series). TNPSC Group 3 gets the Tamil-only pool;
  // every other series gets the general bilingual pool. ----
  for (const { series, examSlug } of testSeriesList) {
    const title = `${series.title} - Test 1`;
    const titleTa = series.titleTa ? `${series.titleTa} - தேர்வு 1` : "";
    const isG3 = examSlug === "tnpsc-group-3";
    const questionPool = isG3 ? seededG3Questions : seededQuestions;
    await upsert(
      Test,
      { testSeriesId: series._id, title },
      {
        title,
        titleTa,
        testSeriesId: series._id,
        durationSeconds: isG3 ? 900 : 3600,
        negativeMarking: true,
        defaultNegativeMarks: 0.25,
        shuffleQuestions: false,
        shuffleOptions: true,
        status: "published",
        questions: questionPool.map((q, idx) => ({
          questionId: q._id,
          order: idx + 1,
          marks: 1,
          negativeMarks: 0.25,
        })),
      },
    );
  }
  console.log(`Tests: ${await Test.countDocuments()} total.`);

  // ---- Sample student users ----
  const studentPlan = [
    { name: "Arun Kumar", email: "arun.kumar@example.com" },
    { name: "Divya Priya", email: "divya.priya@example.com" },
    { name: "Karthik Raja", email: "karthik.raja@example.com" },
    { name: "Meena Sundari", email: "meena.sundari@example.com" },
    { name: "Vignesh S", email: "vignesh.s@example.com" },
  ];
  const passwordHash = await bcrypt.hash("Student@123", 12);
  for (const student of studentPlan) {
    await upsert(
      User,
      { email: student.email },
      {
        name: student.name,
        email: student.email,
        passwordHash,
        role: "student",
        emailVerified: true,
        status: "active",
      },
    );
  }
  console.log(`Users: ${await User.countDocuments({ role: "student" })} students seeded (password: Student@123).`);

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
