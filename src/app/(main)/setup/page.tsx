"use client";

/**
 * Setup Wizard - from fresh deployment to verified Meta webhook, five steps:
 *  1. Create a Meta app
 *  2. Save Instagram app credentials (stored encrypted)
 *  3. Wire the Meta portal (webhook + login redirect)
 *  4. Enable the background engine (one SQL snippet)
 *  5. Understand who can trigger it (testers, going public)
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Wrench, KeyRound, Webhook, Clock3, CheckCircle2, Copy, Check,
    ExternalLink, Loader2, ShieldCheck, AlertTriangle, Users
} from "lucide-react";
import { useSetupStatus, useSaveSetup } from "@/hooks/useSetup";
import { cn } from "@/lib/utils";

function CopyField({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <div>
            <label className="micro-label block mb-1">{label}</label>
            <div className="flex items-center gap-1.5">
                <code className="flex-1 text-[12px] font-mono bg-muted/60 border border-border rounded-lg px-3 py-2 break-all select-all">
                    {value}
                </code>
                <button
                    onClick={copy}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Copiar"
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
            </div>
        </div>
    );
}

function NumberedList({ items }: { items: React.ReactNode[] }) {
    return (
        <ol className="space-y-2 list-none">
            {items.map((content, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] text-foreground/90 leading-relaxed">
                    <span className="w-4.5 h-4.5 min-w-[18px] h-[18px] rounded-full bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span>{content}</span>
                </li>
            ))}
        </ol>
    );
}

function StepCard({
    step, title, icon: Icon, done, children,
}: {
    step: number;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    done?: boolean;
    children: React.ReactNode;
}) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: step * 0.05 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
        >
            <div className="flex items-center gap-3 px-5 h-12 border-b border-border">
                <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                    done ? "bg-secondary/10" : "bg-muted"
                )}>
                    {done ? <CheckCircle2 className="w-4 h-4 text-secondary" /> : <Icon className="w-4 h-4 text-muted-foreground" />}
                </div>
                <span className="micro-label">Passo {step}</span>
                <h2 className="text-[13.5px] font-heading font-semibold text-foreground">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </motion.section>
    );
}

const inputCls = "w-full h-9 text-[13px] font-mono bg-background border border-border rounded-lg px-3 outline-none focus:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring/30 transition-colors";

export default function SetupPage() {
    const { data: setup, isLoading } = useSetupStatus();
    const saveMutation = useSaveSetup();

    const [appId, setAppId] = useState("");
    const [appSecret, setAppSecret] = useState("");
    const [fbAppSecret, setFbAppSecret] = useState("");
    const [saveError, setSaveError] = useState<string | null>(null);
    const [justSaved, setJustSaved] = useState(false);

    const handleSave = () => {
        setSaveError(null);
        saveMutation.mutate(
            {
                metaAppId: appId.trim(),
                metaAppSecret: appSecret.trim(),
                ...(fbAppSecret.trim() ? { metaFbAppSecret: fbAppSecret.trim() } : {}),
            },
            {
                onSuccess: () => { setJustSaved(true); setAppSecret(""); setFbAppSecret(""); },
                onError: (err) => setSaveError(err.message),
            }
        );
    };

    if (isLoading) {
        return (
            <div className="w-full max-w-2xl mx-auto py-24 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const configured = !!setup?.configured;

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 pb-16">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-heading font-semibold tracking-tight text-foreground flex items-center gap-2">
                        <Wrench className="w-4.5 h-4.5 w-[18px] h-[18px] text-muted-foreground" />
                        Assistente de configuração
                    </h1>
                    <p className="text-[13px] text-muted-foreground mt-1 max-w-md">
                        Conecte seu próprio app gratuito de desenvolvedor da Meta. Tudo o que você informar é guardado
                        criptografado no seu banco de dados do Supabase.
                    </p>
                </div>
                {configured && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full shrink-0 mt-1">
                        <ShieldCheck className="w-3 h-3" /> Configurado
                    </span>
                )}
            </div>

            {/* Step 1 */}
            <StepCard step={1} title="Crie seu app da Meta" icon={ExternalLink} done={configured}>
                <NumberedList items={[
                    <>Acesse <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary font-medium underline underline-offset-2">developers.facebook.com/apps</a> e clique em <b>Criar app</b>.</>,
                    <>Caso de uso <b>Outro</b> → tipo de app <b>Empresa</b>.</>,
                    <>No painel do app: <b>Instagram → Configurar</b> (adiciona a &ldquo;API do Instagram com login do Instagram&rdquo;).</>,
                    <>Acesse <b>Instagram → Configuração da API com login do Instagram → 3. Configurar o login empresarial do Instagram</b> e copie o <b>ID do app do Instagram</b> e a <b>chave secreta do app do Instagram</b> exibidos ali. Não use o par que fica em Configurações do app → Básico - ele pertence ao app principal da Meta e o login do Instagram o rejeita com &ldquo;Invalid platform app&rdquo;.</>,
                    <>Seu Instagram precisa ser uma conta <b>Comercial ou de Criador</b> (altere no app: Configurações → Tipo de conta).</>,
                ]} />
                <div className="mt-4 flex items-start gap-2 text-[12px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                    <span>
                        Seu app começa no <b>modo de desenvolvimento</b> - ótimo para construir e testar. Nesse modo, as automações
                        funcionam para contas que têm uma <b>função no seu app</b> (você + testadores - veja o Passo 5). Para que o
                        público em geral possa ativá-las, envie o <b>App Review</b> gratuito da Meta depois que os testes passarem.
                    </span>
                </div>
            </StepCard>

            {/* Step 2 */}
            <StepCard step={2} title="Salve as credenciais do app" icon={KeyRound} done={configured && !justSaved}>
                {configured && (
                    <div className="mb-4 flex items-center gap-2 text-[12px] font-medium text-secondary bg-secondary/10 rounded-lg px-3 py-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Salvo para o app <code className="font-mono font-semibold">{setup?.metaAppId}</code>. Informe de novo abaixo apenas se quiser alterá-las.</span>
                    </div>
                )}
                <div className="space-y-3">
                    <div>
                        <label className="micro-label block mb-1">ID do app do Instagram</label>
                        <input
                            value={appId}
                            onChange={(e) => setAppId(e.target.value)}
                            placeholder={setup?.metaAppId ?? "ex.: 1234567890123456"}
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className="micro-label block mb-1">Chave secreta do app do Instagram</label>
                        <input
                            type="password"
                            value={appSecret}
                            onChange={(e) => setAppSecret(e.target.value)}
                            placeholder="Chave hexadecimal de 32 caracteres"
                            className={inputCls}
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Criptografada antes de chegar ao banco de dados. Nunca registrada em log e nunca exibida de novo.
                        </p>
                    </div>
                    <div>
                        <label className="micro-label block mb-1">Chave secreta do app do Facebook <span className="normal-case font-normal opacity-70">(opcional)</span></label>
                        <input
                            type="password"
                            value={fbAppSecret}
                            onChange={(e) => setFbAppSecret(e.target.value)}
                            placeholder="Somente se a verificação de assinatura do webhook falhar"
                            className={inputCls}
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                            A Meta assina os webhooks com uma das duas chaves, dependendo do tipo de app. Se o painel de depuração mostrar
                            &ldquo;signature mismatch&rdquo; em eventos reais, cole aqui a Chave secreta do app em Configurações do app → Básico.
                        </p>
                    </div>
                    {saveError && <p className="text-[12px] text-destructive font-medium">{saveError}</p>}
                    {justSaved && <p className="text-[12px] text-secondary font-medium">Salvo. Continue com o Passo 3.</p>}
                    <button
                        onClick={handleSave}
                        disabled={saveMutation.isPending || !appId.trim() || !appSecret.trim()}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-foreground text-background text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                        {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                        {saveMutation.isPending ? "Salvando…" : "Salvar credenciais"}
                    </button>
                </div>
            </StepCard>

            {/* Step 3 */}
            <StepCard step={3} title="Configure o portal da Meta" icon={Webhook}>
                {!configured && !justSaved ? (
                    <p className="text-[13px] text-muted-foreground">Conclua o Passo 2 primeiro - o token de verificação do webhook é gerado quando as credenciais são salvas.</p>
                ) : (
                    <div className="space-y-5">
                        <div>
                            <p className="text-[13px] font-medium text-foreground mb-2.5">
                                A. Webhooks - <span className="text-muted-foreground font-normal">Instagram → Configuração da API com login do Instagram → 2. Configurar webhooks</span>
                            </p>
                            <div className="space-y-2.5">
                                <CopyField label="URL de retorno (Callback URL)" value={setup?.webhookUrl ?? ""} />
                                <CopyField label="Token de verificação" value={setup?.webhookVerifyToken ?? ""} />
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2">
                                Clique em <b>Verificar e salvar</b> e depois assine <b>comments</b> e <b>messages</b>.
                            </p>
                        </div>
                        <div className="h-px bg-border" />
                        <div>
                            <p className="text-[13px] font-medium text-foreground mb-2.5">
                                B. Login empresarial - <span className="text-muted-foreground font-normal">3. Configurar o login empresarial do Instagram → Configurações do login empresarial</span>
                            </p>
                            <CopyField label="URI de redirecionamento OAuth" value={setup?.oauthRedirectUri ?? ""} />
                            <p className="text-[11px] text-muted-foreground mt-2">
                                Precisa ser idêntica, caractere por caractere.
                            </p>
                        </div>
                    </div>
                )}
            </StepCard>

            {/* Step 4 */}
            <StepCard step={4} title="Ative o motor em segundo plano" icon={Clock3}>
                <p className="text-[13px] text-muted-foreground mb-3 leading-relaxed">
                    A maioria das DMs é enviada na hora pelo webhook. Esta rotina agendada (cron) entrega o restante - excedente do limite de envios,
                    novas tentativas e renovação automática do token. No <b>Supabase → SQL Editor</b>, troque{" "}
                    <code className="font-mono text-[11px] bg-muted px-1 rounded">YOUR_CRON_SECRET</code> pelo
                    CRON_SECRET da sua implantação e execute:
                </p>
                <div className="relative">
                    <pre className="text-[11px] font-mono bg-zinc-950 text-zinc-300 rounded-lg p-3.5 overflow-x-auto whitespace-pre border border-border">
                        {setup?.cronSnippet ?? ""}
                    </pre>
                    <button
                        onClick={() => void navigator.clipboard.writeText(setup?.cronSnippet ?? "")}
                        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
                        title="Copiar SQL"
                    >
                        <Copy className="w-3 h-3" />
                    </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                    Confira com <code className="font-mono bg-muted px-1 rounded">select * from cron.job;</code> - você deve ver <code className="font-mono bg-muted px-1 rounded">orinchats-process-jobs</code>.
                </p>
            </StepCard>

            {/* Step 5 */}
            <StepCard step={5} title="Quem pode ativar" icon={Users}>
                <div className="space-y-4 text-[13px] text-foreground/90 leading-relaxed">
                    <p>
                        No <b>modo de desenvolvimento</b>, o Instagram só entrega eventos de contas que têm uma função no seu app -
                        dos <b>dois lados</b>: a conta que você conecta <i>e</i> as contas do público cujos comentários, DMs
                        ou respostas a stories ativam automações. O comentário de um desconhecido não gera nenhum webhook.
                    </p>
                    <div>
                        <p className="font-medium text-foreground mb-2">Adicione uma conta de testador:</p>
                        <NumberedList items={[
                            <>Portal da Meta → seu app → <b>Funções do app → Funções → Adicionar pessoas</b>.</>,
                            <>Função <b>Testador do Instagram</b> → nome de usuário do Instagram da pessoa → envie o convite.</>,
                            <>A pessoa aceita <b>dentro do app do Instagram</b>: Configurações → Permissões do site / Apps e sites → <b>Convites de testador → Aceitar</b>. Até lá, os eventos dela ficam invisíveis para o seu webhook.</>,
                        ]} />
                    </div>
                    <div className="flex items-start gap-2 text-[12px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                        <span>
                            <b>Abrir ao público:</b> para ativar com comentários de qualquer pessoa, solicite o <b>Acesso avançado</b> pelo
                            App Review gratuito da Meta - envie uma gravação de tela curta do seu fluxo funcionando. Costuma ser aprovado em poucos dias; nada
                            neste app muda depois disso.
                        </span>
                    </div>
                </div>
            </StepCard>

            {configured && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-secondary/25 bg-secondary/5 p-4 flex items-start gap-3"
                >
                    <CheckCircle2 className="w-4.5 h-4.5 w-[18px] h-[18px] text-secondary shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[13px] font-semibold text-foreground">Configuração concluída - agora conecte o Instagram</p>
                        <p className="text-[13px] text-muted-foreground mt-0.5">
                            Acesse <a href="/settings" className="text-primary font-medium underline underline-offset-2">Configurações</a> e
                            clique em <b>Conectar</b>, usando a conta do Instagram que é dona (ou testadora) do seu app da Meta.
                        </p>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
