import { jsx as _jsx } from "react/jsx-runtime";
export default function VoiceButton({ active, onClick }) {
    return (_jsx("button", { type: "button", onClick: onClick, className: `h-12 w-12 rounded-full border border-accent-rose/40 transition ${active ? "animate-pulseRose bg-accent-rose text-bg-primary shadow-glow" : "bg-bg-elevated text-accent-rose hover:bg-accent-soft/20"}`, "aria-label": active ? "Stop voice input" : "Start voice input", children: "\u25CF" }));
}
