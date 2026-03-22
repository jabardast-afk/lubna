import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const placeholderConversations = [
    "Office rant + confidence plan",
    "Outfit ideas for cousin's wedding",
    "Should I send this message?"
];
export default function ConversationList() {
    return (_jsxs("div", { className: "glass-card rounded-2xl p-4", children: [_jsx("h3", { className: "font-display text-2xl", children: "Conversations" }), _jsx("ul", { className: "mt-3 space-y-2", children: placeholderConversations.map((title) => (_jsx("li", { className: "rounded-xl border border-accent-rose/15 bg-bg-elevated/80 px-3 py-2 text-sm text-text-secondary", children: title }, title))) })] }));
}
