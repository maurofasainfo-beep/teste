"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  leaveCustomerQueueAction,
  type LeaveQueueActionState,
} from "@/lib/queue/customer-queue-actions";

type LeaveQueueDialogProps = {
  token: string;
  onLeft: () => void;
};

export function LeaveQueueDialog({ token, onLeft }: LeaveQueueDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(leaveCustomerQueueAction, {
    status: "idle",
    message: "",
  } satisfies LeaveQueueActionState);
  const visible = open && state.status !== "success";

  useEffect(() => {
    if (state.status === "success") {
      onLeft();
    }
  }, [onLeft, state.status]);

  return (
    <>
      <Button
        className="h-12 w-full text-base"
        type="button"
        variant="destructive"
        onClick={() => setOpen(true)}
      >
        <LogOut aria-hidden className="h-4 w-4" />
        Sair da fila
      </Button>

      {visible ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/60 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-lg border bg-card p-5 shadow-[var(--shadow-panel)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Confirmar saida
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Ao sair, sua entrada na fila sera cancelada. Para entrar
                  novamente, procure um atendente.
                </p>
              </div>
              <Button
                aria-label="Fechar"
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                <X aria-hidden className="h-4 w-4" />
              </Button>
            </div>

            <form action={action} className="mt-5 space-y-3">
              <input type="hidden" name="customer_token" value={token} />
              {state.status === "error" ? (
                <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm font-medium text-danger">
                  {state.message}
                </div>
              ) : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Continuar na fila
                </Button>
                <ConfirmButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" variant="destructive">
      {pending ? (
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut aria-hidden className="h-4 w-4" />
      )}
      {pending ? "Saindo" : "Confirmar saida"}
    </Button>
  );
}
