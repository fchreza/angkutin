/**
 * Ikon SVG inline — tanpa dependensi ikon eksternal supaya bundel tetap kecil
 * (NFR: FCP < 1.8s pada 3G/4G).
 */

type P = { className?: string; size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconPin = ({ className, size = 14 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const IconClock = ({ className, size = 14 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const IconSearch = ({ className, size = 18 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const IconChevronDown = ({ className, size = 16 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconChevronRight = ({ className, size = 16 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const IconPlus = ({ className, size = 18 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconX = ({ className, size = 18 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const IconCheck = ({ className, size = 18 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconTrash = ({ className, size = 16 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const IconCopy = ({ className, size = 16 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

export const IconEdit = ({ className, size = 16 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const IconCamera = ({ className, size = 22 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const IconHome = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20h14V9.5" />
  </svg>
);

export const IconGrid = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

export const IconUser = ({ className, size = 20 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
  </svg>
);

export const IconEye = ({ className, size = 16 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconChat = ({ className, size = 16 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12Z" />
  </svg>
);

export const IconInbox = ({ className, size = 44 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <path d="M3 13h5l1.5 3h5L16 13h5" />
    <path d="M5 5h14l2 8v6H3v-6l2-8Z" />
  </svg>
);

export const IconAlert = ({ className, size = 16 }: P) => (
  <svg {...base(size)} className={className} aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16.5v.01" />
  </svg>
);

/** Ikon WhatsApp resmi (path terisi, bukan garis). */
export const IconWhatsApp = ({ className, size = 18 }: P) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24Zm-2.6 3.9c-.13 0-.35.05-.53.25-.18.2-.7.68-.7 1.66 0 .98.72 1.93.82 2.06.1.13 1.4 2.24 3.47 3.06 1.72.68 2.07.54 2.44.51.37-.03 1.2-.49 1.37-.96.17-.47.17-.88.12-.96-.05-.08-.18-.13-.38-.23-.2-.1-1.2-.59-1.38-.66-.19-.07-.32-.1-.46.1-.13.2-.52.66-.64.8-.12.13-.24.15-.44.05-.2-.1-.86-.32-1.63-1.01-.6-.54-1.01-1.2-1.13-1.4-.12-.2-.01-.31.09-.41.09-.09.2-.24.3-.36.1-.12.13-.2.2-.34.07-.13.03-.25-.02-.35-.05-.1-.44-1.1-.62-1.5-.16-.39-.33-.4-.46-.4h-.4Z" />
  </svg>
);
