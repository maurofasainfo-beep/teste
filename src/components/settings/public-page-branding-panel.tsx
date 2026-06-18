"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { LucideIcon } from "lucide-react";
import {
  ImagePlus,
  Loader2,
  Palette,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  removePublicPageBackgroundAction,
  type PublicPageBrandingActionState,
  updatePublicPageBrandingAction,
  uploadPublicPageBackgroundAction,
} from "@/lib/queue/customer-queue-actions";
import {
  buildPositionCardBackground,
  normalizePublicPageBranding,
  type PublicPageBranding,
} from "@/lib/public-page-branding";

type PublicPageBrandingPanelProps = {
  initialBranding: PublicPageBranding;
};

const initialActionState: PublicPageBrandingActionState = {
  status: "idle",
  message: "",
};

export function PublicPageBrandingPanel({
  initialBranding,
}: PublicPageBrandingPanelProps) {
  const [primaryColor, setPrimaryColor] = useState(initialBranding.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(
    initialBranding.secondaryColor,
  );
  const [overlayColor, setOverlayColor] = useState(initialBranding.overlayColor);
  const [textColor, setTextColor] = useState(initialBranding.textColor);
  const [previewUrl, setPreviewUrl] = useState(initialBranding.backgroundUrl);
  const objectUrlRef = useRef<string | null>(null);
  const [brandingState, brandingAction] = useActionState(
    updatePublicPageBrandingAction,
    initialActionState,
  );
  const [uploadState, uploadAction] = useActionState(
    uploadPublicPageBackgroundAction,
    initialActionState,
  );
  const [removeState, removeAction] = useActionState(
    removePublicPageBackgroundAction,
    initialActionState,
  );

  const previewBranding = useMemo(
    () =>
      normalizePublicPageBranding({
        public_page_primary_color: primaryColor,
        public_page_secondary_color: secondaryColor,
        public_page_position_card_background_url: initialBranding.backgroundUrl,
        public_page_position_card_overlay_color: overlayColor,
        public_page_position_card_text_color: textColor,
      }),
    [
      initialBranding.backgroundUrl,
      overlayColor,
      primaryColor,
      secondaryColor,
      textColor,
    ],
  );

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    const file = event.target.files?.[0];
    if (!file) {
      setPreviewUrl(initialBranding.backgroundUrl);
      return;
    }

    objectUrlRef.current = URL.createObjectURL(file);
    setPreviewUrl(objectUrlRef.current);
  }

  return (
    <section className="rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-3 text-primary">
          <Palette aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Aparencia da pagina publica
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Personalize a area que seus clientes veem ao acompanhar a fila.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
        <div className="space-y-5">
          <form action={brandingAction} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <ColorField
                label="Cor principal"
                name="public_page_primary_color"
                value={primaryColor}
                onChange={setPrimaryColor}
              />
              <ColorField
                label="Cor secundaria"
                name="public_page_secondary_color"
                value={secondaryColor}
                onChange={setSecondaryColor}
              />
              <ColorField
                label="Cor do overlay"
                name="public_page_position_card_overlay_color"
                value={overlayColor}
                onChange={setOverlayColor}
              />
              <ColorField
                label="Cor do texto"
                name="public_page_position_card_text_color"
                value={textColor}
                onChange={setTextColor}
              />
            </div>
            <ActionMessage state={brandingState} />
            <SubmitButton
              icon={Save}
              label="Salvar cores"
              pendingLabel="Salvando"
            />
          </form>

          <div className="border-t pt-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ImagePlus aria-hidden className="h-4 w-4 text-primary" />
              Imagem do card de posicao
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Recomendado: 1200x600 px, JPG, PNG ou WebP, com no maximo 2 MB.
            </p>

            <form
              action={uploadAction}
              className="mt-3 space-y-3"
            >
              <Label className="sr-only" htmlFor="position_card_background">
                Selecionar imagem
              </Label>
              <Input
                accept="image/jpeg,image/png,image/webp"
                className="cursor-pointer file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium"
                id="position_card_background"
                name="position_card_background"
                required
                type="file"
                onChange={handleImageChange}
              />
              <ActionMessage state={uploadState} />
              <div className="flex flex-wrap gap-2">
                <SubmitButton
                  icon={Upload}
                  label="Enviar imagem"
                  pendingLabel="Enviando"
                />
              </div>
            </form>

            {initialBranding.backgroundUrl ? (
              <form action={removeAction} className="mt-2">
                <ActionMessage state={removeState} />
                <SubmitButton
                  icon={Trash2}
                  label="Remover imagem"
                  pendingLabel="Removendo"
                  variant="outline"
                />
              </form>
            ) : null}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Preview
          </p>
          <div
            aria-label="Preview do card publico de posicao"
            className="relative flex aspect-[16/7] min-h-[170px] max-h-[220px] flex-col items-center justify-center overflow-hidden rounded-2xl bg-cover bg-center px-5 text-center shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
            role="img"
            style={{
              backgroundColor: previewBranding.primaryColor,
              backgroundImage: buildPositionCardBackground(
                previewBranding,
                previewUrl,
              ),
              color: previewBranding.textColor,
              textShadow: "0 1px 4px rgba(15, 23, 42, 0.55)",
            }}
          >
            <p className="text-xs font-semibold uppercase opacity-80">
              Posicao atual
            </p>
            <p className="mt-2 text-6xl font-bold leading-none">1o</p>
            <p className="mt-2 text-sm font-medium opacity-90">
              na fila de espera
            </p>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            O enquadramento usa preenchimento proporcional e centro da imagem.
          </p>
        </div>
      </div>
    </section>
  );
}

function ColorField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-center gap-2 rounded-lg border bg-background p-2">
        <input
          aria-label={label}
          className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
          id={name}
          name={name}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <span className="font-mono text-xs font-semibold text-foreground">
          {value}
        </span>
      </div>
    </div>
  );
}

function SubmitButton({
  icon: Icon,
  label,
  pendingLabel,
  variant = "default",
}: {
  icon: LucideIcon;
  label: string;
  pendingLabel: string;
  variant?: "default" | "outline";
}) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" variant={variant}>
      {pending ? (
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      ) : (
        <Icon aria-hidden className="h-4 w-4" />
      )}
      {pending ? pendingLabel : label}
    </Button>
  );
}

function ActionMessage({ state }: { state: PublicPageBrandingActionState }) {
  if (state.status === "idle") return null;

  return (
    <p
      className={
        state.status === "success"
          ? "text-xs font-medium text-success"
          : "text-xs font-medium text-danger"
      }
      role="status"
    >
      {state.message}
    </p>
  );
}
