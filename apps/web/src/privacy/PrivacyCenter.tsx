import { Button } from "../components/ui/button";
const sections = [
  {
    title: "Politica de Privacidade",
    tag: "Dados do piloto",
    body: "Explica como o piloto usa dados para operar com seguranca e responder aos seus direitos.",
    detail:
      "Nada aqui substitui a confirmacao fisica: os dados servem para registrar a rotina e manter riscos visiveis.",
  },
  {
    title: "Termos de Uso",
    tag: "Uso responsavel",
    body: "Define o uso responsavel do aplicativo durante a operacao da loja piloto.",
    detail:
      "O app apoia a conferencia da loja; ele nao deve ser usado para mascarar pendencias ou criar confirmacoes sem execucao.",
  },
  {
    title: "Seguranca da conta",
    tag: "Acesso",
    body: "Senha, sessao e vinculo de loja protegem o acesso as tarefas operacionais.",
    detail:
      "Cada sessao fica vinculada ao papel autorizado para aquela loja, com revogacao quando o acesso deixa de ser valido.",
  },
  {
    title: "Permissoes do aparelho",
    tag: "Celular da operacao",
    body: "Camera, notificacoes e evidencias explicam finalidade, impacto da recusa e caminho manual quando existir.",
    detail:
      "Quando uma permissao falha, o fluxo precisa oferecer alternativa clara em vez de bloquear a rotina silenciosamente.",
  },
  {
    title: "Dados usados pelo app",
    tag: "Registro operacional",
    body: "Identidade, loja, papel, acoes fisicas, lotes, tarefas, evidencias, horarios, auditoria e sincronizacao.",
    detail:
      "O foco e rastrear o que foi observado e confirmado na area de venda; vendas e estoque interno nao fazem parte do piloto.",
  },
  {
    title: "Canal/encarregado",
    tag: "Atendimento",
    body: "Use a lideranca ou administracao como canal inicial para duvidas e solicitacoes de dados.",
    detail:
      "A lideranca da loja encaminha pedidos e orienta o operador sem expor segredos, tokens ou evidencias fora do fluxo.",
  },
  {
    title: "Solicitacao de direitos LGPD",
    tag: "Direitos",
    body: "Peca acesso, correcao, exclusao, portabilidade ou informacoes sobre o tratamento dos seus dados.",
    detail:
      "A solicitacao deve conter contato e contexto suficiente para resposta, sem anexar fotos ou dados sensiveis desnecessarios.",
  },
] as const;
export function PrivacyCenter({ onBack }: { onBack: () => void }) {
  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto grid max-w-6xl gap-6">
        <header className="grid gap-4 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-8">
          <div className="grid gap-3">
            <p className="text-sm font-semibold text-primary">Centro de privacidade do piloto</p>
            <h1 className="max-w-2xl text-[30px] font-semibold leading-9 tracking-[-0.02em] sm:text-4xl sm:leading-[44px]">
              Dados usados para manter a area de venda segura.
            </h1>
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
            {sections.map(({ title, tag, body, detail }) => (
              <section key={title} className="grid gap-3 rounded-xl border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <p className="text-xs font-semibold text-primary">{tag}</p>
                    <h2 className="text-xl font-semibold leading-7">{title}</h2>
                  </div>
                </div>
                <p className="max-w-[75ch] text-base leading-6 text-muted-foreground">{body}</p>
                <p className="max-w-[75ch] rounded-lg bg-muted px-3 py-2 text-sm leading-6 text-muted-foreground">
                  {detail}
                </p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
