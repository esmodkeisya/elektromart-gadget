import Image, { type ImageProps } from "next/image";

type ProductImageProps = Omit<ImageProps, "src" | "alt"> & {
  src: string;
  alt: string;
};

const OPTIMIZED_HOSTS = [
  "images.unsplash.com",
  "picsum.photos",
  "encrypted-tbn0.gstatic.com",
  "files.eci.id",
  "macfinder.co.uk",
  "gameone.ph",
  "commons.wikimedia.org",
  "i02.appmifile.com",
];

/** Host yang diizinkan next.config.js dioptimasi; host asing dimuat langsung agar tidak error. */
function isOptimizable(src: string): boolean {
  if (!src.startsWith("http://") && !src.startsWith("https://")) return true;
  try {
    const { hostname, protocol } = new URL(src);
    if ((protocol === "http:" || protocol === "https:") && (hostname === "localhost" || hostname === "127.0.0.1")) {
      return true;
    }
    if (hostname.endsWith(".supabase.co")) return true;
    return OPTIMIZED_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}

export default function ProductImage({
  src,
  alt,
  className,
  ...props
}: ProductImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      unoptimized={!isOptimizable(src)}
      {...props}
    />
  );
}
