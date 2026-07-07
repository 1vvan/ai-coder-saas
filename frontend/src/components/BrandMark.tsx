interface BrandMarkProps {
  size?: number;
  className?: string;
}

/** The Prelegal logo mark: a stylized document with a yellow accent seal. */
export default function BrandMark({ size = 36, className = "" }: BrandMarkProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-navy shadow-sm ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6 3.5h7.5L18 8v11.5A1 1 0 0 1 17 20.5H7A1 1 0 0 1 6 19.5V4.5A1 1 0 0 1 6 3.5Z"
          fill="#ffffff"
        />
        <path d="M13.5 3.5 18 8h-4.5V3.5Z" fill="#209dd7" />
        <rect x="8" y="10.5" width="6" height="1.4" rx="0.7" fill="#209dd7" />
        <rect x="8" y="13.4" width="6" height="1.4" rx="0.7" fill="#209dd7" />
        <circle cx="16.4" cy="16.4" r="3.1" fill="#ecad0a" />
        <path
          d="m15.1 16.4 1 1 1.7-1.9"
          stroke="#032147"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
