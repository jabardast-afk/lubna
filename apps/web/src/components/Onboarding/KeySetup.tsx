interface KeySetupProps {
  onGrantAccess: () => void;
}

export default function KeySetup({ onGrantAccess }: KeySetupProps) {
  return (
    <div className="glass-card mx-auto max-w-lg rounded-3xl p-8 text-center animate-fadeRise">
      <h2 className="font-display text-4xl text-text-primary">One last thing, and then we're done</h2>
      <p className="mt-3 text-text-secondary">
        Lubna is powered by Google&apos;s free AI. We just need your permission to use it.
      </p>
      <button
        className="mt-7 rounded-full bg-accent-gold px-6 py-3 font-semibold text-bg-primary transition hover:brightness-110"
        onClick={onGrantAccess}
        type="button"
      >
        Give Lubna access →
      </button>
    </div>
  );
}
