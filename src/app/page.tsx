"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { ConversationStage } from "@/components/auth/ConversationStage";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LogoMark, LogoWordmark } from "@/components/ui/Logo";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex bg-background text-foreground font-sans relative overflow-hidden">
      {/* Pontilhado suave de fundo */}
      <div
        className="absolute inset-0 z-0 opacity-[0.10] dark:opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1.5px 1.5px, currentColor 1.5px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Esquerda - formulário */}
      <section className="relative z-10 flex flex-col w-full lg:w-[46%] xl:w-[42%] min-h-screen px-6 sm:px-12 lg:px-14 xl:px-20 py-7">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark className="w-9 h-9 drop-shadow-md" />
            <LogoWordmark className="text-xl" />
          </div>
          <ThemeToggle />
        </header>

        <div className="flex-1 flex items-center py-10">
          <LoginForm />
        </div>

        <footer className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground leading-relaxed">
          OrinChats · Licença MIT · Hospedagem própria · Mensalidades a consultar
        </footer>
      </section>

      {/* Direita - palco com a conversa animada */}
      <aside className="hidden lg:flex relative z-10 flex-1 p-4 xl:p-6">
        <div
          className="relative w-full rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/30"
          style={{ backgroundImage: "linear-gradient(140deg, #FE9A2A 0%, #F97316 45%, #EB4127 100%)" }}
        >
          <ConversationStage />
        </div>
      </aside>
    </div>
  );
}
