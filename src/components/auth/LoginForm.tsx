"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";

/** Somente login - não existe cadastro público de propósito. */

/** Traduz as mensagens de erro mais comuns do Supabase Auth. */
function translateAuthError(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
    if (m.includes("email not confirmed")) return "Este e-mail ainda não foi confirmado.";
    if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde um pouco e tente de novo.";
    if (m.includes("network") || m.includes("fetch")) return "Falha de conexão. Verifique sua internet.";
    return "Não foi possível entrar. Confira os dados e tente novamente.";
}

const fieldCls =
    "w-full h-12 pl-11 pr-4 text-[14px] bg-card/70 border-2 border-border rounded-2xl outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:bg-card transition-colors";

export function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        const supabase = createBrowserClient();

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            if (signInError) {
                setError(translateAuthError(signInError.message));
                return;
            }
            window.location.href = "/dashboard";
        } catch {
            setError("Algo deu errado. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="w-full max-w-[400px]"
        >
            <p className="micro-label flex items-center gap-2 mb-4">
                <span className="w-7 h-[2px] rounded-full brand-thread" />
                Painel de automações
            </p>

            <h1 className="font-heading font-extrabold text-[38px] sm:text-5xl leading-[1.05] tracking-tight mb-3">
                Seus comentários viram{" "}
                <span className="relative inline-block">
                    <span className="font-serif italic font-light text-primary">conversas</span>
                    <svg className="absolute -bottom-1.5 left-0 w-full h-3 text-primary" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden>
                        <motion.path
                            d="M 2 8 Q 50 14 98 4"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            fill="none"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
                        />
                    </svg>
                </span>
                .
            </h1>
            <p className="text-[14px] text-muted-foreground mb-8 leading-relaxed">
                Entre para gerenciar suas automações de comentário para DM no Instagram.
            </p>

            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
                {error && (
                    <p role="alert" className="text-[13px] text-destructive font-medium bg-destructive/10 rounded-xl px-4 py-2.5">
                        {error}
                    </p>
                )}

                <div>
                    <label htmlFor="login-email" className="micro-label block mb-1.5">E-mail</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input
                            id="login-email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="voce@exemplo.com"
                            className={fieldCls}
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="login-password" className="micro-label block mb-1.5">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className={`${fieldCls} pr-12`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative overflow-hidden flex items-center justify-center gap-2 w-full h-12 mt-2 text-[14px] font-bold text-white rounded-full brand-thread shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <ArrowRight className="w-4 h-4 order-2 transition-transform group-hover:translate-x-1" />
                    )}
                    <span className="order-1">{isLoading ? "Entrando…" : "Entrar"}</span>
                </button>
            </form>

        </motion.div>
    );
}
