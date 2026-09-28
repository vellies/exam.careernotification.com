// Importing every Mongoose model once, centrally, guarantees they're
// registered before any `.populate()` call resolves a ref — regardless of
// which route/page happens to run first in a given process.
import "@/src/modules/exams/exam-category.model";
import "@/src/modules/exams/exam.model";
import "@/src/modules/syllabus/board.model";
import "@/src/modules/syllabus/subject.model";
import "@/src/modules/questions/question.model";
import "@/src/modules/test-series/test-series.model";
import "@/src/modules/tests/test.model";
import "@/src/modules/users/user.model";
