import GoogleSignIn from "./GoogleSignIn";

interface WelcomeScreenProps {
  onLogin: () => Promise<void> | void;
}

function RoseMark() {
  return (
    <svg viewBox="0 0 120 120" className="h-24 w-24 animate-fadeRise">
      <defs>
        <linearGradient id="rose" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4A853" />
          <stop offset="100%" stopColor="#C9748A" />
        </linearGradient>
      </defs>
      <path
        d="M60 8L76 28L102 36L90 60L102 84L76 92L60 112L44 92L18 84L30 60L18 36L44 28Z"
        fill="url(#rose)"
        opacity="0.35"
      />
      <path
        d="M60 23C73 23 83 34 83 47C83 59 75 66 67 72C64 74 62 77 60 81C58 77 56 74 53 72C45 66 37 59 37 47C37 34 47 23 60 23Z"
        fill="none"
        stroke="url(#rose)"
        strokeWidth="4"
      />
      <circle cx="60" cy="47" r="8" fill="url(#rose)" />
    </svg>
  );
}

export default function WelcomeScreen({ onLogin }: WelcomeScreenProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6">
      <div className="glass-card w-full max-w-xl rounded-3xl p-8 text-center shadow-glow md:p-12">
        <div className="mx-auto mb-6 w-fit">
          <RoseMark />
        </div>
        <h1 className="font-display text-6xl leading-none text-text-primary md:text-7xl">Meet Lubna</h1>
        <p className="mx-auto mt-3 max-w-md text-lg text-text-secondary">
          Your bestie, your assistant, your safe space
        </p>
        <div className="mx-auto mt-10 max-w-sm">
          <GoogleSignIn onClick={onLogin} />
        </div>
      </div>
    </main>
  );
}
