interface GoogleSignInProps {
  onClick: () => Promise<void> | void;
}

export default function GoogleSignIn({ onClick }: GoogleSignInProps) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-accent-rose/30 bg-gradient-to-r from-accent-rose/80 to-accent-soft/80 px-5 py-3 text-base font-semibold text-text-primary transition duration-300 hover:shadow-glow"
      type="button"
    >
      Continue with Google
    </button>
  );
}
