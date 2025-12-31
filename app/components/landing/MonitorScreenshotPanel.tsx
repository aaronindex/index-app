// app/components/landing/MonitorScreenshotPanel.tsx
'use client';

interface MonitorScreenshotPanelProps {
  imageSrc?: string;
  alt?: string;
  className?: string;
  variant?: 'hero' | 'section';
}

export default function MonitorScreenshotPanel({
  imageSrc,
  alt = 'INDEX screenshot',
  className = '',
  variant = 'hero',
}: MonitorScreenshotPanelProps) {
  // Default to marketing images if no src provided
  const defaultSrc = variant === 'hero' 
    ? '/marketing/hero-macbook.png'
    : '/marketing/section-display.png';

  const finalSrc = imageSrc || defaultSrc;

  return (
    <div className={`relative ${variant === 'hero' ? 'max-w-lg' : 'max-w-md'} mx-auto ${className}`}>
      {/* Subtle shadow/glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--text)/0.03)] to-transparent rounded-3xl blur-xl -z-10" />
      
      {/* Device frame */}
      <div className="p-3 sm:p-4 bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-3xl shadow-lg border border-[rgb(var(--text)/0.08)] dark:border-[rgb(var(--text)/0.15)]">
        <div className="relative overflow-hidden rounded-2xl bg-[rgb(var(--surface2))]">
          <img
            src={finalSrc}
            alt={alt}
            className="w-full h-auto"
            onError={(e) => {
              // Fallback to placeholder if image doesn't exist
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const placeholder = target.parentElement?.querySelector('.placeholder');
              if (placeholder) {
                (placeholder as HTMLElement).style.display = 'flex';
              }
            }}
          />
          <div className="placeholder hidden absolute inset-0 items-center justify-center aspect-video">
            <p className="text-[rgb(var(--muted))] text-sm opacity-40">Screenshot placeholder</p>
          </div>
        </div>
      </div>
    </div>
  );
}
