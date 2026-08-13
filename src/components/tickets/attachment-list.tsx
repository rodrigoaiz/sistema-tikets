import Link from "next/link";
import { FileText, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AttachmentItem = { id: string; filename: string; mimeType: string; size: number };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({
  attachments,
  className,
}: {
  attachments: AttachmentItem[];
  className?: string;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {attachments.map((attachment) => {
        const isImage = attachment.mimeType.startsWith("image/");
        return (
          <Link
            key={attachment.id}
            href={`/api/attachments/${attachment.id}`}
            target="_blank"
            className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2.5 py-1.5 text-xs hover:border-ring"
          >
            {isImage ? (
              <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="max-w-40 truncate">{attachment.filename}</span>
            <span className="text-muted-foreground">{formatSize(attachment.size)}</span>
          </Link>
        );
      })}
    </div>
  );
}
