"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type DrawerProps = {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function Drawer({ open, title, description, children, onClose }: DrawerProps) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50">
          <motion.button
            aria-label="Fechar painel"
            className="absolute inset-0 bg-sidebar/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            type="button"
          />
          <motion.aside
            aria-modal="true"
            className="absolute right-0 top-0 flex h-full w-[min(100vw,36rem)] flex-col border-l bg-card shadow-[var(--shadow-panel)]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-4 border-b p-4 sm:p-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                {description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                ) : null}
              </div>
              <Button aria-label="Fechar" size="icon" type="button" variant="ghost" onClick={onClose}>
                <X aria-hidden className="h-4 w-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
