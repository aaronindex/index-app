// app/components/landing/ValueCard.tsx
'use client';

interface ValueCardProps {
  title: string;
  body: string;
  imageSrc?: string;
  pdfUrl?: string;
  className?: string;
}

export default function ValueCard({
  title,
  body,
  imageSrc,
  pdfUrl,
  className = '',
}: ValueCardProps) {
  return (
    <div className={`rounded-2xl p-10 sm:p-12 text-center bg-[#f4f2f0] ${className}`}>
      <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4 text-[#0b0a08]">
        {title}
      </h3>
      <p className="text-base sm:text-lg max-w-sm mx-auto text-[#686765] mb-6">
        {body}
      </p>
      <div className="mt-6 h-40 w-full bg-white/50 rounded-xl flex items-center justify-center overflow-hidden">
        {imageSrc ? (
          <img src={imageSrc} alt={title} className="max-h-full max-w-full rounded-lg object-cover" />
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
          <span className="text-[#686765] text-sm opacity-40">IMAGE PLACEHOLDER</span>
        )}
      </div>
    </div>
  );
}
