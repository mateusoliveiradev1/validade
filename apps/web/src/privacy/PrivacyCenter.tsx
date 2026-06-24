import { useState } from "react";
import {
  privacyLgpdHubSection,
  privacyTopicParagraphs,
  privacyTopics,
  privacyTopicsById,
  type PrivacyTopicId,
} from "@validade-zero/contracts";
import { Button } from "../components/ui/button";

function configuredPrivacyContact(): string | undefined {
  const value = (
    import.meta.env as { VITE_PRIVACY_CONTACT?: string | undefined }
  ).VITE_PRIVACY_CONTACT?.trim();
  return value !== undefined && value.length > 0 ? value : undefined;
}

export function PrivacyCenter({ onBack }: { onBack: () => void }) {
  const [activeTopic, setActiveTopic] = useState<PrivacyTopicId | null>(null);
  const privacyContact = configuredPrivacyContact();

  if (activeTopic !== null) {
    const topic = privacyTopicsById[activeTopic];
    const paragraphs = privacyTopicParagraphs(topic, privacyContact);

    return (
      <main className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto grid max-w-4xl gap-6">
          <header className="grid gap-4 rounded-xl border bg-card p-5 sm:p-6 lg:p-8">
            <p className="text-xs font-semibold text-primary">{topic.tag}</p>
            <h1 className="max-w-2xl text-[30px] font-semibold leading-9 tracking-[-0.02em] sm:text-4xl sm:leading-[44px]">
              Centro de Privacidade
            </h1>
            <h2 className="text-2xl font-semibold leading-8">{topic.title}</h2>
            <p className="max-w-[68ch] text-base leading-7 text-muted-foreground">{topic.summary}</p>
            <Button
              className="w-full sm:w-fit"
              variant="outline"
              onClick={() => setActiveTopic(null)}
            >
              Voltar ao centro de privacidade
            </Button>
          </header>

          <div className="grid gap-4 rounded-xl border bg-card p-5 sm:p-6">
            {paragraphs.map((paragraph) => (
              <p key={paragraph} className="max-w-[75ch] text-base leading-7 text-foreground">
                {paragraph}
              </p>
            ))}
            <p className="max-w-[75ch] rounded-lg bg-muted px-3 py-2 text-sm leading-6 text-muted-foreground">
              {topic.detail}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto grid max-w-6xl gap-6">
        <header className="grid gap-4 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-8">
          <div className="grid gap-3">
            <p className="text-sm font-semibold text-primary">Centro de privacidade do piloto</p>
            <h1 className="max-w-2xl text-[30px] font-semibold leading-9 tracking-[-0.02em] sm:text-4xl sm:leading-[44px]">
              Centro de Privacidade
            </h1>
            <p className="max-w-2xl text-xl font-semibold leading-7 text-foreground sm:text-2xl">
              Dados usados para manter a area de venda segura.
            </p>
            <p className="max-w-[68ch] text-base leading-7 text-muted-foreground">
              Veja quais informacoes o Validade Zero usa para operar com seguranca, registrar
              evidencias e responder solicitacoes sem expor dados desnecessarios.
            </p>
          </div>
          <Button className="w-full sm:w-fit" variant="outline" onClick={onBack}>
            Voltar ao produto
          </Button>
        </header>

        <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="grid content-start gap-4 rounded-xl border bg-secondary p-5">
            <div className="grid gap-2">
              <h2 className="text-lg font-semibold">Como ler esta tela</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Ela resume o que e coletado, por que existe e como pedir revisao. O objetivo e
                reduzir duvida, nao transformar privacidade em juridiquês.
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold">Regra do piloto</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Dados reais de operacao, evidencias e credenciais nao devem ser copiados para fora
                do app ou do canal autorizado da loja.
              </p>
            </div>
          </aside>

          <div className="grid gap-3">
            {privacyTopics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                aria-label={`Abrir ${topic.title}`}
                className="grid gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/40 sm:p-5"
                onClick={() => setActiveTopic(topic.id)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <p className="text-xs font-semibold text-primary">{topic.tag}</p>
                    <h2 className="text-xl font-semibold leading-7">{topic.title}</h2>
                  </div>
                  <span className="text-xl font-semibold text-muted-foreground" aria-hidden="true">
                    ›
                  </span>
                </div>
                <p className="max-w-[75ch] text-base leading-6 text-muted-foreground">
                  {topic.summary}
                </p>
                <p className="max-w-[75ch] rounded-lg bg-muted px-3 py-2 text-sm leading-6 text-muted-foreground">
                  {topic.detail}
                </p>
              </button>
            ))}

            <section className="grid gap-3 rounded-xl border bg-card p-4 sm:p-5">
              <div className="grid gap-1">
                <p className="text-xs font-semibold text-primary">{privacyLgpdHubSection.tag}</p>
                <h2 className="text-xl font-semibold leading-7">{privacyLgpdHubSection.title}</h2>
              </div>
              <p className="max-w-[75ch] text-base leading-6 text-muted-foreground">
                {privacyLgpdHubSection.summary}
              </p>
              <p className="max-w-[75ch] rounded-lg bg-muted px-3 py-2 text-sm leading-6 text-muted-foreground">
                {privacyLgpdHubSection.detail}
              </p>
              <p className="max-w-[75ch] text-sm leading-6 text-muted-foreground">
                No aplicativo mobile, use o formulario LGPD dentro deste centro para registrar o
                pedido com canal de retorno.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
