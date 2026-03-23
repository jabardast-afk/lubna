interface LubnaAvatarProps {
  size?: number;
  className?: string;
}

export default function LubnaAvatar({ size = 48, className = "" }: LubnaAvatarProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Lubna avatar"
    >
      <defs>
        <linearGradient id="lubna-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E7A65F" />
          <stop offset="100%" stopColor="#C9748A" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="rgba(255,255,255,0.06)" />
      <g className="avatar-ponytail">
        <path d="M78 18 C96 18, 104 36, 96 58 C92 69, 90 82, 96 94" fill="none" stroke="#2A1B27" strokeWidth="12" strokeLinecap="round" />
      </g>
      <path d="M38 43 C38 25, 50 15, 66 15 C83 15, 94 28, 94 46 C94 61, 85 75, 70 82 L47 82 C40 75, 34 61, 34 49 C34 46, 35 44, 38 43 Z" fill="#231620" />
      <path d="M58 27 C76 27, 90 41, 90 59 C90 77, 76 92, 58 92 C40 92, 28 77, 28 59 C28 41, 40 27, 58 27 Z" fill="#C68642" />
      <path d="M31 89 C40 80, 53 75, 68 75 C82 75, 94 80, 102 89 L102 111 L18 111 L18 97 C21 94, 25 91, 31 89 Z" fill="url(#lubna-top)" />
      <path d="M42 61 C46 58, 50 58, 54 61" fill="none" stroke="#382018" strokeWidth="3" strokeLinecap="round" />
      <path d="M62 61 C66 58, 70 58, 74 61" fill="none" stroke="#382018" strokeWidth="3" strokeLinecap="round" />
      <path d="M51 74 C56 79, 63 80, 69 74" fill="none" stroke="#8C4132" strokeWidth="3" strokeLinecap="round" />
      <circle cx="48" cy="57" r="2.8" fill="#2D1A14" />
      <circle cx="69" cy="57" r="2.8" fill="#2D1A14" />
      <path d="M76 31 C83 32, 89 37, 90 45" fill="none" stroke="#3A2230" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
