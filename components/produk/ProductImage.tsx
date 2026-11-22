import Image, { type ImageProps } from "next/image";

type ProductImageProps = Omit<ImageProps, "src" | "alt"> & {
  src: string;
  alt: string;
};

/** Gambar lokal dioptimasi Next.js; URL eksternal dimuat langsung browser (hindari timeout server). */
export default function ProductImage({
  src,
  alt,
  className,
  ...props
}: ProductImageProps) {
  const isExternal = src.startsWith("http://") || src.startsWith("https://");

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      unoptimized={isExternal}
      {...props}
    />
  );
}
