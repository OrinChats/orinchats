"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Instagram, CheckCircle2, XCircle, Loader2, Unlink, AlertTriangle, RefreshCw, Wrench, PauseCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@/lib/supabase";
import { apiClient, ApiError } from "@/lib/api/client";
import { useInstagramAccounts, useRefreshInstagramToken, useResubscribeWebhook, useCheckSubscription } from "@/hooks/useInstagramAccounts";
import { useSetupStatus } from "@/hooks/useSetup";
import { useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="w-full max-w-3xl mx-auto py-24 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}>
            <SettingsContent />
        </Suspense>
    );
}

function SettingsContent() {
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { data: accounts, isLoading } = useInstagramAccounts();
    const { data: setup } = useSetupStatus();

    const refreshMutation = useRefreshInstagramToken();
    const resubscribeMutation = useResubscribeWebhook();
    const checkSubscriptionMutation = useCheckSubscription();
    const [connectingIG, setConnectingIG] = useState(false);
    const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
    const [refreshingId, setRefreshingId] = useState<string | null>(null);
    const [resubscribingId, setResubscribingId] = useState<string | null>(null);
    const [checkingSubId, setCheckingSubId] = useState<string | null>(null);
    const [subStatus, setSubStatus] = useState<Record<string, { subscribedFields: string[]; hasComments: boolean; hasMessages: boolean } | null>>({});
    const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

    useEffect(() => {
        const igConnected = searchParams.get("instagram_connected");
        const igError = searchParams.get("instagram_error");

        if (igConnected === "true") {
            setBanner({ type: "success", message: "Conta do Instagram conectada." });
            void queryClient.invalidateQueries({ queryKey: ["instagram-accounts"] });
            window.history.replaceState({}, "", "/settings");
        } else if (igError) {
            const errorMessages: Record<string, string> = {
                access_denied: "A conexão com o Instagram foi cancelada.",
                no_instagram_business_account: "Nenhuma conta Comercial ou de Criador do Instagram encontrada. Converta seu Instagram para conta profissional primeiro.",
                account_already_connected: "Esta conta do Instagram já está conectada a outro usuário nesta instância.",
                state_mismatch: "A conexão expirou. Tente novamente.",
                setup_required: "Salve primeiro as credenciais do seu app da Meta no Assistente de configuração.",
                server_error: "Algo deu errado. Confira os detalhes e tente novamente.",
                invalid_callback: "Retorno inválido. Tente novamente.",
                test_user_required: "Adicione esta conta do Instagram como usuário de teste para usar a ferramenta de automação. No seu app da Meta, vá em Funções do app > Funções > Adicionar pessoas > Testador do Instagram, depois aceite o convite no Instagram (Configurações > Apps e sites > Convites de testador) e conecte novamente.",
            };
            const debugDetail = searchParams.get("debug");
            setBanner({
                type: "error",
                message: (errorMessages[igError] ?? `Erro: ${igError}`) + (debugDetail ? ` - ${debugDetail}` : ""),
            });
            window.history.replaceState({}, "", "/settings");
        }
    }, [searchParams, queryClient]);

    useEffect(() => {
        if (!banner) return;
        const timer = setTimeout(() => setBanner(null), 8000);
        return () => clearTimeout(timer);
    }, [banner]);

    const handleConnectInstagram = async () => {
        setConnectingIG(true);
        try {
            const { url } = await apiClient<{ url: string }>("/instagram/connect");
            window.location.href = url;
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Não foi possível iniciar a conexão com o Instagram";
            setBanner({ type: "error", message });
            setConnectingIG(false);
        }
    };

    const handleDisconnect = async (accountId: string) => {
        if (!confirm("Desconectar esta conta do Instagram? Todas as automações ligadas a ela serão excluídas.")) return;
        setDisconnectingId(accountId);
        try {
            await apiClient(`/instagram/disconnect/${accountId}`, { method: "DELETE" });
            void queryClient.invalidateQueries({ queryKey: ["instagram-accounts"] });
            setBanner({ type: "success", message: "Conta do Instagram desconectada." });
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Não foi possível desconectar a conta";
            setBanner({ type: "error", message });
        } finally {
            setDisconnectingId(null);
        }
    };

    const handleCheckSubscription = async (accountId: string) => {
        setCheckingSubId(accountId);
        try {
            const result = await checkSubscriptionMutation.mutateAsync(accountId);
            setSubStatus(prev => ({ ...prev, [accountId]: result }));
        } catch {
            setSubStatus(prev => ({ ...prev, [accountId]: null }));
        } finally {
            setCheckingSubId(null);
        }
    };

    const handleResubscribe = async (accountId: string) => {
        setResubscribingId(accountId);
        try {
            const result = await resubscribeMutation.mutateAsync(accountId);
            setBanner({ type: "success", message: `Assinatura do webhook atualizada (${result.subscribedFields}). Comente em uma das suas publicações para testar.` });
            void handleCheckSubscription(accountId);
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Não foi possível atualizar a assinatura do webhook";
            setBanner({ type: "error", message });
        } finally {
            setResubscribingId(null);
        }
    };

    const handleRefreshToken = async (accountId: string) => {
        setRefreshingId(accountId);
        try {
            await refreshMutation.mutateAsync(accountId);
            setBanner({ type: "success", message: "Token renovado - válido por mais 60 dias." });
        } catch (err) {
            const apiErr = err instanceof ApiError ? err : null;
            if (apiErr?.status === 400) {
                setBanner({ type: "error", message: "O token expirou. Reconecte sua conta do Instagram." });
            } else {
                setBanner({ type: "error", message: "Não foi possível renovar o token. Tente novamente." });
            }
        } finally {
            setRefreshingId(null);
        }
    };

    const handleSignOut = async () => {
        const supabase = createBrowserClient();
        await supabase.auth.signOut();
        window.location.href = "/";
    };

    return (
        <div className="w-full max-w-3xl mx-auto space-y-5 pb-16">
            <div>
                <h1 className="text-xl font-heading font-semibold tracking-tight text-foreground">Configurações</h1>
                <p className="text-[13px] text-muted-foreground mt-1">Contas conectadas e esta instância.</p>
            </div>

            {banner && (
                <div className={cn(
                    "flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[13px] font-medium",
                    banner.type === "success"
                        ? "bg-secondary/10 text-secondary"
                        : "bg-destructive/10 text-destructive"
                )}>
                    {banner.type === "success"
                        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                        : <XCircle className="w-4 h-4 shrink-0" />}
                    <span className="min-w-0">{banner.message}</span>
                </div>
            )}

            {/* Meta app */}
            <section className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <h2 className="text-[14px] font-heading font-semibold text-foreground">App da Meta</h2>
                    <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                        {setup?.configured
                            ? <>Configurado - app <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{setup.metaAppId}</code></>
                            : "Não configurado - o motor fica desligado até a configuração ser concluída."}
                    </p>
                </div>
                <Link
                    href="/setup"
                    className={cn(
                        "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                        setup?.configured
                            ? "border border-border hover:bg-muted text-foreground"
                            : "bg-foreground text-background font-semibold hover:opacity-90"
                    )}
                >
                    <Wrench className="w-3.5 h-3.5" />
                    {setup?.configured ? "Assistente de configuração" : "Concluir configuração"}
                </Link>
            </section>

            {/* Instagram accounts */}
            <section className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-[14px] font-heading font-semibold text-foreground">Contas do Instagram</h2>
                        <p className="text-[13px] text-muted-foreground mt-0.5">
                            Somente contas Comerciais ou de Criador.
                        </p>
                    </div>
                    <button
                        onClick={handleConnectInstagram}
                        disabled={connectingIG}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-foreground text-background text-[13px] font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                        {connectingIG ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Instagram className="w-3.5 h-3.5" />}
                        {connectingIG ? "Conectando…" : "Conectar"}
                    </button>
                </div>

                <div className="space-y-2">
                    {isLoading ? (
                        <div className="space-y-2">
                            {[1, 2].map((i) => (
                                <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
                            ))}
                        </div>
                    ) : accounts && accounts.length > 0 ? (
                        accounts.map((account) => (
                            <div key={account.id} className="space-y-2">
                                {account.is_paused && (
                                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-[12px] font-medium bg-destructive/10 text-destructive">
                                        <PauseCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                        <span>
                                            <b>Pausa de segurança</b> - o Instagram sinalizou os envios, então as DMs estão pausadas
                                            até {account.paused_until ? new Date(account.paused_until).toLocaleString("pt-BR") : "mais tarde"} para
                                            proteger esta conta.
                                        </span>
                                    </div>
                                )}

                                {account.token_status !== "ok" && (
                                    <div className={cn(
                                        "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-[12px] font-medium",
                                        account.token_status === "expired"
                                            ? "bg-destructive/10 text-destructive"
                                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    )}>
                                        <div className="flex items-center gap-2 min-w-0">
                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate">
                                                {account.token_status === "expired"
                                                    ? "Token expirado - automações pausadas. Reconecte para retomar."
                                                    : `O token expira em ${account.token_days_remaining} ${account.token_days_remaining === 1 ? "dia" : "dias"} - a rotina automática o renova, ou renove agora.`}
                                            </span>
                                        </div>
                                        {account.token_status === "expiring" ? (
                                            <button
                                                onClick={() => handleRefreshToken(account.id)}
                                                disabled={refreshingId === account.id}
                                                className="inline-flex items-center gap-1 font-semibold shrink-0 hover:opacity-80"
                                            >
                                                {refreshingId === account.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                Renovar
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleConnectInstagram}
                                                disabled={connectingIG}
                                                className="inline-flex items-center gap-1 font-semibold shrink-0 hover:opacity-80"
                                            >
                                                Reconectar
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative w-9 h-9 rounded-full brand-ring p-[1.5px] shrink-0">
                                            <div className="w-full h-full rounded-full bg-background overflow-hidden flex items-center justify-center">
                                                {account.profile_picture_url ? (
                                                    <img src={account.profile_picture_url} alt={account.username} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Instagram className="w-4 h-4 text-muted-foreground" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[13px] font-semibold text-foreground truncate">@{account.username}</span>
                                                {account.token_status === "ok" && !account.is_paused
                                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0" />
                                                    : <AlertTriangle className={cn("w-3.5 h-3.5 shrink-0", account.token_status === "expired" ? "text-destructive" : "text-amber-500")} />}
                                            </div>
                                            <span className="text-[11px] text-muted-foreground">
                                                Conectada em {new Date(account.created_at).toLocaleDateString("pt-BR", { month: "short", day: "numeric", year: "numeric" })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <button
                                            onClick={() => handleCheckSubscription(account.id)}
                                            disabled={checkingSubId === account.id}
                                            title="Verificar quais campos de webhook a Meta tem ativos para esta conta"
                                            className="inline-flex items-center gap-1 h-7 px-2 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                                        >
                                            {checkingSubId === account.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                            {checkingSubId === account.id ? "Verificando…" : "Verificar status"}
                                        </button>
                                        <button
                                            onClick={() => handleResubscribe(account.id)}
                                            disabled={resubscribingId === account.id}
                                            title="Sincronizar de novo a assinatura do webhook"
                                            className="inline-flex items-center gap-1 h-7 px-2 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                                        >
                                            {resubscribingId === account.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                            {resubscribingId === account.id ? "Sincronizando…" : "Corrigir webhooks"}
                                        </button>
                                        <button
                                            onClick={() => handleDisconnect(account.id)}
                                            disabled={disconnectingId === account.id}
                                            className="inline-flex items-center gap-1 h-7 px-2 text-[12px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                        >
                                            {disconnectingId === account.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
                                            Desconectar
                                        </button>
                                    </div>
                                </div>

                                {subStatus[account.id] !== undefined && (
                                    <div className={cn(
                                        "px-3 py-2.5 rounded-lg text-[12px] font-mono",
                                        subStatus[account.id] === null
                                            ? "bg-destructive/10 text-destructive"
                                            : subStatus[account.id]?.hasComments
                                            ? "bg-secondary/10 text-secondary"
                                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    )}>
                                        {subStatus[account.id] === null ? (
                                            <span>Não foi possível buscar o status da assinatura na Meta.</span>
                                        ) : (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold">{subStatus[account.id]?.hasComments ? "✓ comentários" : "✗ comentários"}</span>
                                                    <span className="font-bold">{subStatus[account.id]?.hasMessages ? "✓ mensagens" : "✗ mensagens"}</span>
                                                </div>
                                                <div className="text-muted-foreground text-[10px]">
                                                    {subStatus[account.id]?.subscribedFields.join(", ") || "nenhum"}
                                                </div>
                                                {!subStatus[account.id]?.hasComments && (
                                                    <div className="text-[10px]">
                                                        Os comentários não estão assinados - use &ldquo;Corrigir webhooks&rdquo; e confira se a URL de retorno está verificada no portal da Meta.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-[13px] text-muted-foreground">
                            <Instagram className="w-6 h-6 mx-auto mb-2 opacity-30" />
                            <p>Nenhuma conta conectada ainda.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Account */}
            <section className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                <h2 className="text-[14px] font-heading font-semibold text-foreground">Sessão</h2>
                <button
                    onClick={handleSignOut}
                    className="h-8 px-3 rounded-lg text-[13px] font-medium text-muted-foreground border border-border hover:text-destructive hover:border-destructive/40 transition-colors"
                >
                    Sair
                </button>
            </section>
        </div>
    );
}
