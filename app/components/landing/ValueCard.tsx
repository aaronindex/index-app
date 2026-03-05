// app/components/landing/ValueCard.tsx
'use client';

interface ValueCardProps {
  title: string;
  body: string;
  imageSrc?: string;
  pdfUrl?: string;
  className?: string;
  /** Optional background image for the card surface (used on landing). */
  backgroundImageSrc?: string;
  /** When true, render text/icon in a high-contrast on-dark style. */
  dark?: boolean;
}

export default function ValueCard({
  title,
  body,
  imageSrc,
  pdfUrl,
  className = '',
  backgroundImageSrc,
  dark = false,
}: ValueCardProps) {
  const content = (
    <>
      <div>
        <h3
          className={
            dark
              ? 'text-2xl sm:text-3xl font-semibold tracking-tight mb-4 text-white'
              : 'text-2xl sm:text-3xl font-semibold tracking-tight mb-4 text-[#0b0a08]'
          }
        >
          {title}
        </h3>
        <p
          className={
            dark
              ? 'text-base sm:text-lg max-w-sm mx-auto text-white/85 mb-6'
              : 'text-base sm:text-lg max-w-sm mx-auto text-[#686765] mb-6'
          }
        >
          {body}
        </p>
      </div>
      <div className="mt-auto h-40 w-full flex items-center justify-center">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            className={dark ? 'max-h-full max-w-full object-contain drop-shadow-lg' : 'max-h-full max-w-full object-contain'}
          />
        ) : pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#0b0a08] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            Open PDF
          </a>
        ) : (
          <span className={dark ? 'text-white/70 text-sm opacity-70' : 'text-[#686765] text-sm opacity-40'}>
            IMAGE PLACEHOLDER
          </span>
        )}
      </div>
    </>
  );

  // Dark / background-image variant (used on homepage cards)
  if (backgroundImageSrc || dark) {
    return (
      <div className={`relative rounded-2xl overflow-hidden ${className}`}>
        {backgroundImageSrc && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${backgroundImageSrc}')` }}
          />
        )}
        {dark && (
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/85" />
        )}
        <div className="relative p-10 sm:p-12 text-center flex flex-col justify-between">
          {content}
        </div>
      </div>
    );
  }

  // Default light variant
  return (
    <div className={`rounded-2xl p-10 sm:p-12 text-center bg-[#f4f2f0] flex flex-col justify-between ${className}`}>
      {content}
    </div>
  );
}
