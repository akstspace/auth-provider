import Image from "next/image"
import { User } from "lucide-react"

export function AccountAvatar({
  image,
}: {
  image: string | null | undefined
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={40}
        height={40}
        unoptimized
        className="size-10 shrink-0 rounded-full object-cover"
      />
    )
  }

  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
      <User className="size-4" />
    </span>
  )
}
