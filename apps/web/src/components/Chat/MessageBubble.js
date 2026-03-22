import { jsx as _jsx } from "react/jsx-runtime";
export default function MessageBubble({ message }) {
    const isUser = message.role === "user";
    return (_jsx("div", { className: `flex ${isUser ? "justify-end" : "justify-start"} animate-fadeRise`, children: _jsx("div", { className: `max-w-[90%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed md:max-w-[72%] ${isUser ? "bg-bubble-user text-text-primary" : "bg-bubble-lubna text-text-primary shadow-[inset_0_0_16px_rgba(201,116,138,0.14)]"}`, children: message.content }) }));
}
