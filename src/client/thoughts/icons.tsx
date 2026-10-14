type IconProps = { size?: number };

export const PlusIcon = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 5v14M5 12h14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const CloseIcon = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const MoreIcon = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="6" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="18" cy="12" r="1.6" />
  </svg>
);

export const PersonIcon = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M5.5 19c.8-3.2 3.3-5 6.5-5s5.7 1.8 6.5 5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

export const EyeSlashIcon = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 8.5C6.2 12.2 8.9 14 12 14c3.1 0 5.8-1.8 8-5.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <path d="M5 19L19 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const FlagIcon = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 4v16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path
      d="M6 5h10l-1.6 3.6L16 12.2H6"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

export const TrashIcon = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 7h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M9 7V5h6v2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M7.5 7l.8 12h7.4l.8-12" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);

export const HourglassIcon = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M7 4h10M7 20h10M8 4v3.5L12 12l4-4.5V4M8 20v-3.5L12 12l4 4.5V20"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SmileIcon = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8.5 13.5c1 1.6 2.3 2.3 3.5 2.3s2.5-.7 3.5-2.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="9.2" cy="10" r="1" fill="currentColor" />
    <circle cx="14.8" cy="10" r="1" fill="currentColor" />
  </svg>
);

