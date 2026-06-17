"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Edit3, Loader2, MessageSquareText, Sparkles } from "lucide-react";
import { upsertTemplateAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_MESSAGE_TEMPLATE_CONTENT } from "@/lib/message-template-defaults";
import type { MessageTemplate, MessageTemplateType } from "@/lib/types/database";

type TemplateTypeConfig = {
  value: MessageTemplateType;
  label: string;
  description: string;
};

type TemplateWorkspaceProps = {
  templates: MessageTemplate[];
  templateTypes: TemplateTypeConfig[];
};

const variables = [
  "{{nome_cliente}}",
  "{{telefone_cliente}}",
  "{{nome_empresa}}",
  "{{codigo_senha}}",
  "{{link_fila}}",
  "{{quantidade_pessoas}}",
  "{{posicao_fila}}",
];

function getTemplateForType(
  templates: MessageTemplate[],
  type: MessageTemplateType | null,
) {
  if (!type) {
    return undefined;
  }

  const typedTemplates = templates.filter((template) => template.type === type);
  return typedTemplates.find((template) => template.active) ?? typedTemplates[0];
}

export function TemplateWorkspace({
  templates,
  templateTypes,
}: TemplateWorkspaceProps) {
  const [selectedType, setSelectedType] = useState<MessageTemplateType | null>(null);

  const selectedConfig = useMemo(
    () => templateTypes.find((item) => item.value === selectedType),
    [selectedType, templateTypes],
  );
  const selectedTemplate = useMemo(
    () => getTemplateForType(templates, selectedType),
    [selectedType, templates],
  );

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-2">
        {templateTypes.map((type) => {
          const template = getTemplateForType(templates, type.value);
          const previewContent =
            template?.content ?? DEFAULT_MESSAGE_TEMPLATE_CONTENT[type.value];

          return (
            <section
              className="rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]"
              key={type.value}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MessageSquareText aria-hidden className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-foreground">
                    {type.label}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {type.description}
                  </p>
                </div>
                <StatusBadge status={template?.active ?? true ? "active" : "inactive"} />
              </div>

              <div className="mt-5 rounded-lg border bg-background p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Conteudo
                </p>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-foreground">
                  {previewContent}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  {type.value}
                </span>
                <Button type="button" variant="outline" onClick={() => setSelectedType(type.value)}>
                  <Edit3 aria-hidden className="h-4 w-4" />
                  Editar
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-6 rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Sparkles aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Variaveis disponiveis
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Marcadores aceitos nas mensagens automaticas.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {variables.map((variable) => (
            <span
              className="rounded-full border bg-background px-3 py-1 font-mono text-xs text-muted-foreground"
              key={variable}
            >
              {variable}
            </span>
          ))}
        </div>
      </section>

      <Drawer
        description={selectedConfig?.description}
        onClose={() => setSelectedType(null)}
        open={Boolean(selectedType)}
        title={selectedConfig?.label ?? "Template"}
      >
        {selectedConfig ? (
          <form action={upsertTemplateAction} className="space-y-4">
            <input type="hidden" name="template_id" value={selectedTemplate?.id ?? ""} />
            <input type="hidden" name="type" value={selectedConfig.value} />
            <div className="space-y-2">
              <Label htmlFor={`title-${selectedConfig.value}`}>Titulo</Label>
              <Input
                id={`title-${selectedConfig.value}`}
                name="title"
                defaultValue={selectedTemplate?.title ?? selectedConfig.label}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`content-${selectedConfig.value}`}>Conteudo</Label>
              <Textarea
                className="min-h-56"
                id={`content-${selectedConfig.value}`}
                name="content"
                defaultValue={
                  selectedTemplate?.content ??
                  DEFAULT_MESSAGE_TEMPLATE_CONTENT[selectedConfig.value]
                }
                required
              />
            </div>
            <label className="flex items-center gap-2 rounded-lg border bg-background p-3 text-sm font-medium">
              <input
                className="h-4 w-4 accent-primary"
                type="checkbox"
                name="active"
                defaultChecked={selectedTemplate?.active ?? true}
              />
              Ativo
            </label>
            <SaveTemplateButton />
          </form>
        ) : null}
      </Drawer>
    </>
  );
}

function SaveTemplateButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? (
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      ) : (
        <Edit3 aria-hidden className="h-4 w-4" />
      )}
      {pending ? "Salvando" : "Salvar template"}
    </Button>
  );
}
