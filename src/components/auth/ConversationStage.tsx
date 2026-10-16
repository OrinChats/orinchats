"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, Zap, MousePointerClick, Link2, Heart } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";

/**
 * Palco da tela de login: uma conversa de exemplo que se repete em loop,
 * mostrando o caminho comentário → automação → DM → botão de revelação → link.
 */

const TOTAL_STEPS = 6;

export function ConversationStage() {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const delay = step === 0 ? 900 : step === TOTAL_STEPS ? 3200 : 1700;
        const t = setTimeout(() => setStep((s) => (s >= TOTAL_STEPS ? 0 : s + 1)), delay);
        return () => clearTimeout(t);
    }, [step]);

    return (
        <div className="absolute inset-0 text-white">
            {/* Pontilhado + laranja gigante ao fundo */}
            <div
                className="absolute inset-0 opacity-[0.18]"
                style={{
                    backgroundImage: "radial-gradient(circle at 1.5px 1.5px, #fff 1.5px, transparent 0)",
                    backgroundSize: "30px 30px",
                }}
            />
            <motion.div
                aria-hidden
                animate={{ rotate: 360 }}
                transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
                className="absolute -right-40 -bottom-40 w-[620px] h-[620px] rounded-full border border-white/25"
            />
            <motion.div
                aria-hidden
                animate={{ rotate: -360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute -right-24 -bottom-24 w-[460px] h-[460px] rounded-full border border-dashed border-white/30"
            />
            <div aria-hidden className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-white/10 blur-2xl" />

            {/* Título do palco */}
            <div className="absolute top-8 left-10 right-10 flex items-start justify-between">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">Como funciona</p>
                    <h2 className="mt-2 text-3xl xl:text-4xl font-heading font-extrabold leading-[1.05] tracking-tight max-w-md">
                        Um comentário vira uma <span className="font-serif italic font-light">conversa</span> em segundos.
                    </h2>
                </div>
                <LogoMark className="w-12 h-12 drop-shadow-xl shrink-0" />
            </div>

            {/* Conversa */}
            <div className="absolute inset-x-8 xl:inset-x-14 top-[38%] bottom-16 flex flex-col justify-center gap-4">
                {/* 1 - comentário */}
                <div className="h-[72px]">
                    <AnimatePresence>
                        {step >= 1 && (
                            <motion.div
                                key="comment"
                                initial={{ opacity: 0, x: -30, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                                className="inline-flex items-center gap-3 bg-white text-[#2C3236] rounded-2xl rounded-bl-md pl-3 pr-5 py-3 shadow-2xl shadow-black/20"
                            >
                                <span className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-sm font-bold">
                                    M
                                </span>
                                <span>
                                    <span className="flex items-center gap-1.5 text-[11px] text-[#6A7177] font-semibold">
                                        <MessageCircle className="w-3 h-3" /> @maria.silva comentou
                                    </span>
                                    <span className="block text-[15px] font-semibold">Quero o link! 🙋‍♀️</span>
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 2 - automação detecta a palavra */}
                <div className="h-10 flex items-center">
                    <AnimatePresence>
                        {step >= 2 && (
                            <motion.div
                                key="detect"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="ml-6 inline-flex items-center gap-2 rounded-full bg-[#2C3236]/85 backdrop-blur px-4 py-2 text-[12px] font-semibold shadow-lg"
                            >
                                <motion.span
                                    animate={{ scale: [1, 1.25, 1] }}
                                    transition={{ duration: 0.9, repeat: Infinity }}
                                    className="text-[#FE9A2A]"
                                >
                                    <Zap className="w-3.5 h-3.5" fill="currentColor" />
                                </motion.span>
                                Palavra-chave <span className="text-[#FE9A2A]">QUERO</span> detectada
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 3/4 - DM de abertura */}
                <div className="min-h-[150px] flex justify-end">
                    <AnimatePresence mode="wait">
                        {step === 3 && (
                            <motion.div
                                key="typing"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="self-start bg-white/95 rounded-2xl rounded-br-md px-5 py-4 shadow-2xl shadow-black/20 flex gap-1.5"
                                aria-label="Digitando"
                            >
                                {[0, 1, 2].map((i) => (
                                    <motion.span
                                        key={i}
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                                        className="w-2 h-2 rounded-full bg-[#6A7177]"
                                    />
                                ))}
                            </motion.div>
                        )}
                        {step >= 4 && (
                            <motion.div
                                key="dm"
                                initial={{ opacity: 0, x: 30, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                                className="w-full max-w-[330px] bg-white text-[#2C3236] rounded-2xl rounded-br-md p-4 shadow-2xl shadow-black/25"
                            >
                                <p className="flex items-center gap-1.5 text-[11px] text-[#6A7177] font-semibold mb-1.5">
                                    <Send className="w-3 h-3" /> Mensagem direta enviada
                                </p>
                                <p className="text-[14px] leading-snug">
                                    Oi, Maria! Que bom ter você aqui <Heart className="inline w-3.5 h-3.5 text-red-500 -mt-0.5" fill="currentColor" /> Toque abaixo e eu te mando o link ✨
                                </p>

                                <AnimatePresence mode="wait">
                                    {step < 5 ? (
                                        <motion.div
                                            key="btn"
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="mt-3 h-10 rounded-xl bg-[#EFEADD] text-[13px] font-bold flex items-center justify-center gap-1.5"
                                        >
                                            <MousePointerClick className="w-4 h-4 text-primary" /> Me envia o link
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="link"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="mt-3 h-10 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EB4127] text-white text-[13px] font-bold flex items-center justify-center gap-1.5"
                                        >
                                            <Link2 className="w-4 h-4" /> seusite.com.br/oferta
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Chip flutuante */}
            <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-8 left-10 bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl px-4 py-2.5 text-[12px] font-semibold"
            >
                100% na sua conta · mensalidades a consultar
            </motion.div>
        </div>
    );
}
