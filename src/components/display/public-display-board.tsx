"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, Moon, Sun, Tv, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";
import type { PublicCompany, PublicQueueEntry } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type PublicDisplayBoardProps = {
  company: PublicCompany;
  initialEntries: PublicQueueEntry[];
};

type BroadcastPayload = {
  payload?: {
    record?: PublicQueueEntry;
  };
};

export function PublicDisplayBoard({
  company,
  initialEntries,
}: PublicDisplayBoardProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<PublicQueueEntry | null>(
    null,
  );
  const [dark, setDark] = useState(false);
  const [tvMode, setTvMode] = useState(false);

  const refreshEntries = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.rpc("get_public_queue_entries", {
      queue_slug: company.public_queue_slug,
    });

    if (data) {
      setEntries(data);
    }
  }, [company.public_queue_slug]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`public-display:${company.public_queue_slug}`, {
        config: { private: false },
      })
      .on("broadcast", { event: "queue_changed" }, (payload: BroadcastPayload) => {
        const record = payload.payload?.record;
        void refreshEntries();

        if (record?.status === "released") {
          setAnnouncement(record);
          setHighlightedId(record.id);
          window.setTimeout(() => setHighlightedId(null), 3500);
          window.setTimeout(() => setAnnouncement(null), 5000);
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [company.public_queue_slug, refreshEntries]);

  const waiting = useMemo(
    () => entries.filter((entry) => entry.status === "waiting"),
    [entries],
  );
  const released = useMemo(
    () => entries.filter((entry) => entry.status === "released"),
    [entries],
  );

  async function enterFullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
    }
  }

  return (
    <div
      className={cn(
        "min-h-screen overflow-hidden p-4 transition-colors sm:p-6 lg:p-8",
        dark ? "bg-[#07111f] text-white" : "bg-background text-foreground",
        tvMode && "p-3 sm:p-4 lg:p-6",
      )}
    >
      <AnimatePresence>
        {announcement ? (
          <motion.div
            aria-live="assertive"
            className="fixed inset-0 z-40 flex items-center justify-center bg-sidebar/65 p-6 backdrop-blur-md"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className={cn(
                "display-glow w-full max-w-4xl rounded-lg border p-8 text-center shadow-[var(--shadow-panel)] sm:p-12",
                dark
                  ? "border-success/40 bg-[#0b1727] text-white"
                  : "border-success/40 bg-card text-foreground",
              )}
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
            >
              <p className="text-sm font-semibold uppercase tracking-normal text-success">
                Cliente liberado
              </p>
              <h2 className="mt-5 truncate text-5xl font-semibold tracking-normal sm:text-7xl">
                {announcement.customer_name}
              </h2>
              <p className="mt-6 inline-flex rounded-lg bg-primary px-6 py-3 font-mono text-3xl font-semibold text-primary-foreground sm:text-5xl">
                {announcement.ticket_code}
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <header
        className={cn(
          "mb-6 flex flex-col gap-4 rounded-lg border p-5 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between",
          dark ? "border-white/10 bg-white/5" : "bg-card",
        )}
      >
        <div className="min-w-0">
          <p
            className={cn(
              "text-sm font-semibold uppercase",
              dark ? "text-white/55" : "text-muted-foreground",
            )}
          >
            Display publico
          </p>
          <h1
            className={cn(
              "mt-2 truncate font-semibold tracking-normal",
              tvMode ? "text-5xl sm:text-7xl" : "text-3xl sm:text-5xl",
            )}
          >
            {company.trade_name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            aria-label={dark ? "Tema claro" : "Tema escuro"}
            size="icon"
            type="button"
            variant={dark ? "secondary" : "outline"}
            onClick={() => setDark((value) => !value)}
          >
            {dark ? (
              <Sun aria-hidden className="h-4 w-4" />
            ) : (
              <Moon aria-hidden className="h-4 w-4" />
            )}
          </Button>
          <Button
            aria-label="Modo TV"
            size="icon"
            type="button"
            variant={tvMode ? "default" : "outline"}
            onClick={() => setTvMode((value) => !value)}
          >
            <Tv aria-hidden className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Tela cheia"
            size="icon"
            type="button"
            variant="outline"
            onClick={() => void enterFullscreen()}
          >
            <Maximize2 aria-hidden className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <DisplayColumn
          dark={dark}
          entries={waiting}
          highlightedId={highlightedId}
          title="NA FILA"
          tvMode={tvMode}
        />
        <DisplayColumn
          dark={dark}
          entries={released}
          highlightedId={highlightedId}
          prominent
          title="LIBERADOS"
          tvMode={tvMode}
        />
      </main>
    </div>
  );
}

function DisplayColumn({
  title,
  entries,
  highlightedId,
  prominent = false,
  dark,
  tvMode,
}: {
  title: string;
  entries: PublicQueueEntry[];
  highlightedId?: string | null;
  prominent?: boolean;
  dark: boolean;
  tvMode: boolean;
}) {
  return (
    <section
      className={cn(
        "min-h-[520px] rounded-lg border p-4 shadow-[var(--shadow-soft)]",
        dark ? "border-white/10 bg-white/5" : "bg-card",
        tvMode && "min-h-[70vh]",
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          className={cn(
            "font-semibold tracking-normal",
            tvMode ? "text-4xl" : "text-2xl",
          )}
        >
          {title}
        </h2>
        <span
          className={cn(
            "rounded-full px-4 py-1 text-sm font-semibold",
            dark ? "bg-white/10 text-white" : "bg-secondary text-foreground",
          )}
        >
          {entries.length}
        </span>
      </div>
      <div className="grid gap-3">
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={cn(
                "rounded-lg border p-4 transition-all",
                dark
                  ? "border-white/10 bg-[#0b1727] text-white"
                  : "bg-background text-foreground",
                prominent ? "min-h-32" : "min-h-24",
                highlightedId === entry.id &&
                  "display-glow border-success bg-success/10",
              )}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              key={entry.id}
              layout
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate font-semibold tracking-normal",
                      prominent
                        ? tvMode
                          ? "text-5xl"
                          : "text-3xl sm:text-4xl"
                        : tvMode
                          ? "text-4xl"
                          : "text-xl sm:text-2xl",
                    )}
                  >
                    {entry.customer_name}
                  </p>
                  {entry.position ? (
                    <p
                      className={cn(
                        "mt-2 font-medium",
                        dark ? "text-white/55" : "text-muted-foreground",
                        tvMode ? "text-xl" : "text-sm",
                      )}
                    >
                      Posicao {entry.position}
                    </p>
                  ) : null}
                  <p
                    className={cn(
                      "mt-2 inline-flex items-center gap-2 font-medium",
                      dark ? "text-white/55" : "text-muted-foreground",
                      tvMode ? "text-xl" : "text-sm",
                    )}
                  >
                    <UsersRound aria-hidden className="h-4 w-4" />
                    {entry.party_size}{" "}
                    {entry.party_size === 1 ? "pessoa" : "pessoas"}
                  </p>
                </div>
                <p
                  className={cn(
                    "shrink-0 rounded-lg bg-primary px-4 py-3 font-mono font-semibold text-primary-foreground",
                    prominent || tvMode ? "text-3xl" : "text-xl",
                  )}
                >
                  {entry.ticket_code}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {entries.length === 0 ? (
          <div
            className={cn(
              "flex min-h-48 items-center justify-center rounded-lg border border-dashed text-lg font-medium",
              dark ? "border-white/10 text-white/45" : "text-muted-foreground",
            )}
          >
            Sem registros
          </div>
        ) : null}
      </div>
    </section>
  );
}
