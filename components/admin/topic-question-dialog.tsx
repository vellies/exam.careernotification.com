"use client";

import { useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { QuestionForm } from "@/components/admin/question-form";

type QuestionInitial = ComponentProps<typeof QuestionForm>["initial"];

/**
 * Opens the question form in a modal, fixed to one topic. Without `question` it adds a new
 * question ("Add Question" button); with it, it edits that question (pencil icon).
 */
export function TopicQuestionDialog({
  topicId,
  question,
}: {
  topicId: string;
  question?: { id: string; initial: QuestionInitial };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Bumped on each open so the form resets to its initial values every time.
  const [formKey, setFormKey] = useState(0);

  function handleOpenChange(next: boolean) {
    if (next) setFormKey((k) => k + 1);
    setOpen(next);
  }

  const initial: QuestionInitial = question?.initial ?? {
    type: "mcq_single",
    questionEn: "",
    questionTa: "",
    options: [
      { id: "A", text: { en: "", ta: "" } },
      { id: "B", text: { en: "", ta: "" } },
    ],
    correctAnswer: "",
    explanationEn: "",
    explanationTa: "",
    difficulty: "medium",
    subjectId: topicId,
    tags: "",
    status: "published",
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {question ? (
        <AlertDialogTrigger
          aria-label="Edit"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <Pencil className="size-4" />
        </AlertDialogTrigger>
      ) : (
        <AlertDialogTrigger className={buttonVariants()}>
          <Plus className="size-4" />
          Add Question
        </AlertDialogTrigger>
      )}
      <AlertDialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <AlertDialogTitle>{question ? "Edit question" : "Add question"}</AlertDialogTitle>
        <div className="mt-2">
          <QuestionForm
            key={formKey}
            id={question?.id}
            initial={{ ...initial, subjectId: topicId }}
            subjects={[]}
            lockSubject
            onSaved={() => {
              setOpen(false);
              router.refresh();
            }}
            onCancel={() => setOpen(false)}
          />
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
