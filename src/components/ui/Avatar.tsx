"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/id";

const tones = [
  "bg-navy-600 text-white",
  "bg-saffron-600 text-white",
  "bg-leaf-600 text-white",
  "bg-gold-600 text-white",
  "bg-violet-600 text-white",
];

function toneFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return tones[h % tones.length];
}

export function Avatar({
  name,
  photo,
  size = "md",
  className,
}: {
  name: string;
  photo?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dims = { xs: "size-6 text-[10px]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-12 text-base", xl: "size-16 text-xl" };
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold ring-2 ring-surface",
        dims[size],
        photo ? "" : toneFor(name),
        className,
      )}
    >
      {photo ? (
        <Image src={photo} alt={name} fill sizes="64px" className="object-cover" unoptimized />
      ) : (
        initials(name)
      )}
    </span>
  );
}
