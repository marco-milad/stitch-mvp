interface Props {
  src: string;
  alt: string;
  /** Absolute-fill the relative parent. Parent must be `position: relative`. */
  fill?: boolean;
  /** Apply a subtle dark gradient overlay over the image so white text stays readable. */
  overlay?: boolean;
  /** Override the overlay gradient (default: bottom-to-top black/60 → transparent). */
  overlayClassName?: string;
  /** Render priority — use 'eager' for above-the-fold hero, 'lazy' for the rest. */
  loading?: 'eager' | 'lazy';
  /** Extra classes for the image element. */
  className?: string;
}

/**
 * Renders an Unsplash photo with an optional dark gradient overlay.
 * Intentionally stateless — logs load / error events to the console for
 * inspection in DevTools. If the image fetch fails the browser shows its
 * own broken-image glyph, but the absolute container retains its layout.
 */
export function UnsplashImage({
  src,
  alt,
  fill,
  overlay = true,
  overlayClassName = 'bg-gradient-to-t from-black/60 to-transparent',
  loading = 'lazy',
  className,
}: Props) {
  const base = fill ? 'absolute inset-0 w-full h-full' : 'w-full h-full';
  return (
    <>
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => {
          // eslint-disable-next-line no-console
          console.log('[UnsplashImage] loaded', { src, alt });
        }}
        onError={(e) => {
          // eslint-disable-next-line no-console
          console.error('[UnsplashImage] failed to load', {
            src,
            alt,
            naturalWidth: (e.currentTarget as HTMLImageElement).naturalWidth,
            naturalHeight: (e.currentTarget as HTMLImageElement).naturalHeight,
            complete: (e.currentTarget as HTMLImageElement).complete,
          });
        }}
        className={[base, 'object-cover', className].filter(Boolean).join(' ')}
      />
      {overlay && (
        <div className={['absolute inset-0 pointer-events-none', overlayClassName].join(' ')} />
      )}
    </>
  );
}
