"use client";

import { useState } from "react";
import { CheckCircle2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type BilingualText = { en?: string; ta?: string };

export type QuestionPreview = {
  type: string;
  difficulty?: string;
  question: BilingualText;
  options: { id: string; text: BilingualText }[];
  correctAnswer: string;
  explanation?: BilingualText;
};

function Bilingual({ text, className }: { text?: BilingualText; className?: string }) {
  if (!text?.en && !text?.ta) return null;
  return (
    <div className={className}>
      {text.en ? <p>{text.en}</p> : null}
      {text.ta ? (
        <p className={text.en ? "text-muted-foreground" : undefined}>{text.ta}</p>
      ) : null}
    </div>
  );
}

export function QuestionPreviewButton({ question }: { question: QuestionPreview }) {
  const [open, setOpen] = useState(false);
  const hasOptions = question.type !== "integer" && question.options.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        aria-label="View options"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Eye className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <AlertDialogTitle>Question preview</AlertDialogTitle>
        <p className="mt-1 text-xs text-muted-foreground capitalize">
          {question.type.replace("_", " ")}
          {question.difficulty ? ` · ${question.difficulty}` : ""}
        </p>

        <Bilingual text={question.question} className="mt-4 space-y-1 text-sm font-medium" />

        {hasOptions ? (
          <ul className="mt-4 space-y-2">
            {question.options.map((option) => {
              const correct = option.id === question.correctAnswer;
              return (
                <li
                  key={option.id}
                  className={`flex gap-3 rounded-lg border px-3 py-2 text-sm ${
                    correct
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-border"
                  }`}
                >
                  <span className="font-semibold">{option.id}.</span>
                  <Bilingual text={option.text} className="flex-1 space-y-0.5" />
                  {correct ? (
                    <CheckCircle2
                      className="size-4 shrink-0 text-emerald-600"
                      aria-label="Correct answer"
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm">
            <span className="font-semibold">Answer:</span> {question.correctAnswer}
          </p>
        )}

        {question.explanation?.en || question.explanation?.ta ? (
          <div className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm">
            <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
              Explanation
            </p>
            <Bilingual text={question.explanation} className="space-y-1" />
          </div>
        ) : null}

        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
