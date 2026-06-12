"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/browser";

type LoginFormProps = {
  isConfigured: boolean;
};

export function LoginForm({ isConfigured }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfigured) {
      setError("Configure o Supabase antes de entrar.");
      return;
    }

    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();

    const { error: authError } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setPending(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push(mode === "login" ? "/auth/redirect" : "/onboarding");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md border bg-card/95 shadow-[var(--shadow-panel)]">
      <CardHeader>
        <CardTitle>{mode === "login" ? "Login Geral" : "Criar acesso"}</CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Acesse o ambiente da sua empresa."
            : "Crie o primeiro acesso e finalize a empresa em seguida."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              required
            />
          </div>
          {error ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button className="w-full" type="submit" disabled={pending || !isConfigured}>
            {mode === "login" ? (
              <LogIn aria-hidden className="h-4 w-4" />
            ) : (
              <UserPlus aria-hidden className="h-4 w-4" />
            )}
            {pending ? "Aguarde" : mode === "login" ? "Entrar" : "Criar acesso"}
          </Button>
        </form>
        <Button
          className="mt-3 w-full"
          variant="ghost"
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Criar primeiro acesso" : "Já tenho acesso"}
        </Button>
      </CardContent>
    </Card>
  );
}
