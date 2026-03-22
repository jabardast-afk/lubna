import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import VoiceButton from "./VoiceButton";
export default function InputBar({ onSend, voiceActive, onVoiceToggle, liveTranscript }) {
    const [value, setValue] = useState("");
    const submit = async (event) => {
        event.preventDefault();
        const message = value.trim() || liveTranscript?.trim();
        if (!message)
            return;
        setValue("");
        await onSend(message);
    };
    return (_jsxs("form", { onSubmit: submit, className: "glass-card flex items-end gap-3 rounded-2xl p-3", children: [_jsx("textarea", { value: value || liveTranscript || "", onChange: (event) => setValue(event.target.value), rows: 1, placeholder: "Tell Lubna what\u2019s on your mind...", className: "max-h-28 min-h-[48px] flex-1 resize-y rounded-xl border border-transparent bg-bg-elevated px-4 py-3 text-text-primary outline-none placeholder:text-text-muted focus:border-accent-rose/30" }), _jsx("button", { type: "button", className: "h-12 w-12 rounded-full bg-bg-elevated text-xl text-accent-gold transition hover:bg-accent-soft/20", "aria-label": "Attach image", children: "+" }), _jsx(VoiceButton, { active: voiceActive, onClick: onVoiceToggle }), _jsx("button", { type: "submit", className: "h-12 rounded-full bg-accent-rose px-5 font-semibold text-bg-primary transition hover:brightness-110", children: "Send" })] }));
}
