import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function KeySetup({ onGrantAccess }) {
    return (_jsxs("div", { className: "glass-card mx-auto max-w-lg rounded-3xl p-8 text-center animate-fadeRise", children: [_jsx("h2", { className: "font-display text-4xl text-text-primary", children: "One last thing, and then we're done" }), _jsx("p", { className: "mt-3 text-text-secondary", children: "Lubna is powered by Google's free AI. We just need your permission to use it." }), _jsx("button", { className: "mt-7 rounded-full bg-accent-gold px-6 py-3 font-semibold text-bg-primary transition hover:brightness-110", onClick: onGrantAccess, type: "button", children: "Give Lubna access \u2192" })] }));
}
