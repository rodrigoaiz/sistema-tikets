"use client";

import Image from "next/image";
import { Download, FileText, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AttachmentItem = { id: string; filename: string; mimeType: string; size: number };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentClassName(tone: "default" | "inverse") {
  return cn(
    "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
    tone === "inverse"
      ? "border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/15"
      : "border-border bg-background/60 hover:border-ring"
  );
}

function AttachmentLabel({
  attachment,
  isPreviewableImage,
  tone,
}: {
  attachment: AttachmentItem;
  isPreviewableImage: boolean;
  tone: "default" | "inverse";
}) {
  const secondaryClassName =
    tone === "inverse" ? "text-primary-foreground/70" : "text-muted-foreground";

  return (
    <>
      {isPreviewableImage ? (
        <ImageIcon className={cn("size-3.5 shrink-0", secondaryClassName)} />
      ) : (
        <FileText className={cn("size-3.5 shrink-0", secondaryClassName)} />
      )}
      <span className="max-w-40 truncate">{attachment.filename}</span>
      <span className={secondaryClassName}>{formatSize(attachment.size)}</span>
    </>
  );
}

export function AttachmentList({
  attachments,
  className,
  tone = "default",
}: {
  attachments: AttachmentItem[];
  className?: string;
  tone?: "default" | "inverse";
}) {
  if (attachments.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {attachments.map((attachment) => {
        const attachmentUrl = `/api/attachments/${attachment.id}`;
        const downloadUrl = `${attachmentUrl}?download=1`;
        const isPreviewableImage = [
          "image/png",
          "image/jpeg",
          "image/webp",
          "image/gif",
        ].includes(attachment.mimeType);

        if (!isPreviewableImage) {
          return (
            <a
              key={attachment.id}
              href={downloadUrl}
              download={attachment.filename}
              className={attachmentClassName(tone)}
            >
              <AttachmentLabel
                attachment={attachment}
                isPreviewableImage={false}
                tone={tone}
              />
              <Download className="size-3.5 shrink-0 opacity-70" />
            </a>
          );
        }

        return (
          <Dialog key={attachment.id}>
            <DialogTrigger
              render={<button type="button" className={attachmentClassName(tone)} />}
            >
              <AttachmentLabel
                attachment={attachment}
                isPreviewableImage
                tone={tone}
              />
            </DialogTrigger>
            <DialogContent className="gap-3 p-3 sm:max-w-5xl">
              <DialogHeader className="px-1 pt-1">
                <DialogTitle className="pr-10">{attachment.filename}</DialogTitle>
                <DialogDescription>{formatSize(attachment.size)}</DialogDescription>
              </DialogHeader>
              <div className="relative h-[70vh] max-h-[48rem] min-h-64 overflow-hidden rounded-lg bg-muted/60">
                <Image
                  src={attachmentUrl}
                  alt={attachment.filename}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, 80vw"
                  className="object-contain"
                />
              </div>
              <DialogFooter className="-mx-3 -mb-3 px-3 py-3">
                <a
                  href={downloadUrl}
                  download={attachment.filename}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Download />
                  Descargar
                </a>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
}
