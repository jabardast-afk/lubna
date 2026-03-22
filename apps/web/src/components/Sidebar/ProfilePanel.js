import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function ProfilePanel({ session, onLogout }) {
    return (_jsxs("div", { className: "glass-card rounded-2xl p-4", children: [_jsx("h3", { className: "font-display text-2xl", children: "You + Lubna" }), session ? (_jsxs("div", { className: "mt-3 space-y-3 text-sm text-text-secondary", children: [_jsx("p", { children: session.name }), _jsx("p", { children: session.email }), _jsx("button", { className: "rounded-full border border-accent-rose/35 px-4 py-2 text-text-primary transition hover:bg-accent-rose/15", onClick: onLogout, type: "button", children: "Log out" })] })) : (_jsx("p", { className: "mt-3 text-sm text-text-muted", children: "Signed out" }))] }));
}
