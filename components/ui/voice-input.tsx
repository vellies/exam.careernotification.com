"use client";

import * as React from "react";
import { Mic, Square } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechToText } from "@/lib/use-speech-to-text";

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * Appends text to an input/textarea the same way typing would, so React's
 * onChange fires and both controlled and uncontrolled fields stay in sync.
 */
function appendToField(el: FieldElement, text: string) {
  const current = el.value;
  const next = current && !/\s$/.test(current) ? `${current} ${text}` : `${current}${text}`;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, next);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

type VoiceButtonProps = {
  lang?: string;
  disabled?: boolean;
  onResult: (text: string) => void;
  className?: string;
};

/** Standalone mic toggle. Renders nothing where the browser has no speech recognition. */
export function VoiceButton({ lang, disabled, onResult, className }: VoiceButtonProps) {
  const { supported, listening, error, toggle } = useSpeechToText({ lang, onResult });
  if (!supported) return null;

  return (
    <button
      type="button"
      // Keep focus in the field so clicking the mic doesn't blur it.
      onMouseDown={(e) => e.preventDefault()}
      onClick={toggle}
      disabled={disabled}
      title={error ?? (listening ? "Listening… click to stop" : "Voice input")}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
      aria-pressed={listening}
      className={cn(
        "inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        listening && "bg-destructive text-white hover:bg-destructive/90 hover:text-white",
        error && !listening && "text-destructive",
        className
      )}
    >
      {listening ? (
        <span className="relative flex size-4 items-center justify-center">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/60" />
          <Square className="relative size-2.5 fill-current" />
        </span>
      ) : (
        <Mic className="size-4" />
      )}
    </button>
  );
}

type VoiceProps = {
  /** Speech language, e.g. "en-IN" (default) or "ta-IN". */
  voiceLang?: string;
  /** Set false to hide the mic button. */
  voice?: boolean;
};

/** Finds the input/textarea rendered inside a voice wrapper. */
function fieldIn(wrapper: HTMLDivElement | null): FieldElement | null {
  return wrapper?.querySelector<FieldElement>("input, textarea") ?? null;
}

/** Drop-in replacement for <Input> with a speech-to-text mic button. */
export function VoiceInput({
  voiceLang,
  voice = true,
  className,
  ref,
  ...props
}: React.ComponentProps<"input"> & VoiceProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  // Dictation only makes sense for free text, not email/number/date/password etc.
  const textLike = !props.type || props.type === "text" || props.type === "search";

  if (!voice || !textLike) return <Input ref={ref} className={className} {...props} />;

  return (
    <div ref={wrapperRef} className="relative w-full min-w-0 flex-1">
      <Input ref={ref} className={cn("pr-9", className)} {...props} />
      <VoiceButton
        lang={voiceLang}
        disabled={props.disabled || props.readOnly}
        onResult={(text) => {
          const el = fieldIn(wrapperRef.current);
          if (el) appendToField(el, text);
        }}
        className="absolute top-1/2 right-1 -translate-y-1/2"
      />
    </div>
  );
}

/** Drop-in replacement for <Textarea> with a speech-to-text mic button. */
export function VoiceTextarea({
  voiceLang,
  voice = true,
  className,
  ref,
  ...props
}: React.ComponentProps<"textarea"> & VoiceProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  if (!voice) return <Textarea ref={ref} className={className} {...props} />;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Textarea ref={ref} className={cn("pr-9", className)} {...props} />
      <VoiceButton
        lang={voiceLang}
        disabled={props.disabled || props.readOnly}
        onResult={(text) => {
          const el = fieldIn(wrapperRef.current);
          if (el) appendToField(el, text);
        }}
        className="absolute top-1.5 right-1"
      />
    </div>
  );
}
