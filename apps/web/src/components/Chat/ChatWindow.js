import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
export default function ChatWindow({ messages, loading }) {
    const endRef = useRef(null);
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);
    return (_jsxs("div", { className: "scrollbar-thin flex-1 space-y-3 overflow-y-auto pr-2", children: [messages.map((message) => (_jsx(MessageBubble, { message: message }, message.id))), loading && (_jsxs("div", { className: "inline-flex items-center gap-2 rounded-full border border-accent-rose/20 bg-bubble-lubna px-4 py-2 text-sm text-text-secondary", children: [_jsx("span", { className: "h-2 w-2 animate-pulse rounded-full bg-accent-rose" }), _jsx("span", { className: "h-2 w-2 animate-pulse rounded-full bg-accent-rose [animation-delay:120ms]" }), _jsx("span", { className: "h-2 w-2 animate-pulse rounded-full bg-accent-rose [animation-delay:220ms]" }), "Lubna is thinking..."] })), _jsx("div", { ref: endRef })] }));
}
