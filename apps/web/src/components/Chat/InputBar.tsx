import { FormEvent, useState } from "react";
import VoiceButton from "./VoiceButton";

interface InputBarProps {
  onSend: (value: string) => Promise<void>;
  voiceActive: boolean;
  onVoiceToggle: () => void;
  liveTranscript?: string;
}

export default function InputBar({ onSend, voiceActive, onVoiceToggle, liveTranscript }: InputBarProps) {
  const [value, setValue] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const message = value.trim() || liveTranscript?.trim();
    if (!message) return;
    setValue("");
    await onSend(message);
  };

  return (
    <form onSubmit={submit} className="glass-card flex items-end gap-3 rounded-2xl p-3">
      <textarea
        value={value || liveTranscript || ""}
        onChange={(event) => setValue(event.target.value)}
        rows={1}
        placeholder="Tell Lubna what’s on your mind..."
        className="max-h-28 min-h-[48px] flex-1 resize-y rounded-xl border border-transparent bg-bg-elevated px-4 py-3 text-text-primary outline-none placeholder:text-text-muted focus:border-accent-rose/30"
      />
      <button
        type="button"
        className="h-12 w-12 rounded-full bg-bg-elevated text-xl text-accent-gold transition hover:bg-accent-soft/20"
        aria-label="Attach image"
      >
        +
      </button>
      <VoiceButton active={voiceActive} onClick={onVoiceToggle} />
      <button
        type="submit"
        className="h-12 rounded-full bg-accent-rose px-5 font-semibold text-bg-primary transition hover:brightness-110"
      >
        Send
      </button>
    </form>
  );
}
