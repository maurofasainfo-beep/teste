import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupWarning() {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle aria-hidden className="h-5 w-5 text-destructive" />
          Supabase não configurado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          Crie um arquivo <code className="font-mono">.env.local</code> com as
          variáveis do Supabase antes de autenticar ou carregar dados.
        </p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">
{`NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000`}
        </pre>
      </CardContent>
    </Card>
  );
}
