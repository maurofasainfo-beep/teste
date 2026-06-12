"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CustomerLinkActionsProps = {
  customerLink: string;
  className?: string;
  compact?: boolean;
};

export function CustomerLinkActions({
  customerLink,
  className,
  compact = false,
}: CustomerLinkActionsProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(customerLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button
        size={compact ? "sm" : "default"}
        type="button"
        variant="outline"
        onClick={() => void copyLink()}
      >
        {copied ? (
          <Check aria-hidden className="h-4 w-4" />
        ) : (
          <Copy aria-hidden className="h-4 w-4" />
        )}
        {copied ? "Copiado" : "Copiar link"}
      </Button>
      <Button asChild size={compact ? "sm" : "default"} variant="secondary">
        <Link href={customerLink} target="_blank">
          <ExternalLink aria-hidden className="h-4 w-4" />
          Abrir link
        </Link>
      </Button>
    </div>
  );
}
