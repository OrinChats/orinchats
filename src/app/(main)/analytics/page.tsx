"use client";

/**
 * Analytics - the engine's own event trail, visualized.
 *
 * Palette note: the categorical colors are validated (CVD separation, chroma,
 * contrast) per mode against the card surfaces - light and dark are separately
 * chosen steps, not an automatic flip. Series identity is never color-alone:
 * every chart ships a legend, hover tooltips, and the table view below.
 */

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from "recharts";
import { Loader2, MessageCircle, Send, Image as ImageIcon, Users, UserCheck, AlertTriangle, ChartNoAxesColumn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useActiveAccount } from "@/hooks/useActiveAccount";

/* Validated categorical palette - fixed slot order, per-mode steps */
const PALETTE = {
    light: { comments: "#F97316", dms: "#2F8FB5", stories: "#4A9A3F", delivered: "#C98A0B", contacts: "#EB4127" },
    dark: { comments: "#FE9A2A", dms: "#4FB3D9", stories: "#5BB04F", delivered: "#E8B02A", contacts: "#F2674C" },
};

const RANGES = [
    { label: "7d", days: 7 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
] as const;

function fmtDay(iso: string): string {
    const d = new Date(iso + "T00:00:00Z");
    return d.toLocaleDateString("pt-BR", { month: "short", day: "numeric", timeZone: "UTC" });
}

function LegendRow({ items }: { items: { label: string; color: string }[] }) {
    return (
        <div className="flex items-center gap-4 flex-wrap">
            {items.map((it) => (
                <span key={it.label} className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: it.color }} />
                    {it.label}
                </span>
            ))}
        </div>
    );
}

interface TooltipEntry { name?: string; value?: number | string; color?: string }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
            <p className="text-[11px] font-semibold text-foreground mb-1">{label ? fmtDay(String(label)) : ""}</p>
            {payload.map((p, i) => (
                <p key={i} className="text-[11.5px] text-muted-foreground flex items-center gap-1.5 tabular-nums">
                    <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: p.color }} />
                    {p.name}: <span className="text-foreground font-medium">{p.value}</span>
                </p>
            ))}
        </div>
    );
}

export default function AnalyticsPage() {
    const { resolvedTheme } = useTheme();
    const colors = PALETTE[resolvedTheme === "light" ? "light" : "dark"];

    const { account, accountId } = useActiveAccount();
    const [rangeDays, setRangeDays] = useState<number>(30);
    const [automationId, setAutomationId] = useState<string>("all");

    const { from, to } = useMemo(() => {
        const now = new Date();
        return {
            from: new Date(now.getTime() - rangeDays * 86400_000).toISOString(),
            to: now.toISOString(),
        };
    }, [rangeDays]);

    const { data, isLoading } = useAnalytics({ from, to, automationId, accountId });

    const gridStroke = resolvedTheme === "light" ? "#E4DDCC" : "#465056";
    const axisTick = { fontSize: 10.5, fill: "#8A9196" } as const;
    const surface = resolvedTheme === "light" ? "#FFFFFF" : "#343B40";

    const totals = data?.totals;
    const funnel = totals
        ? [
              { label: "Ativadas", value: totals.triggers },
              { label: "DMs entregues", value: totals.delivered },
              { label: "Fluxos de botão concluídos", value: totals.flowsCompleted },
              { label: "Novos seguidores", value: totals.followsGained },
          ]
        : [];
    const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

    const tiles = totals
        ? [
              { label: "Ativações", value: totals.triggers, sub: `${totals.comments} comentários · ${totals.dmKeywords} DMs · ${totals.storyReplies} stories`, icon: MessageCircle },
              { label: "DMs entregues", value: totals.delivered, sub: totals.failed > 0 ? `${totals.failed} com falha` : "sem falhas", icon: Send },
              { label: "Novos seguidores", value: totals.followsGained, sub: `${totals.askToFollowShown} pedidos para seguir`, icon: UserCheck },
              { label: "Novos contatos", value: totals.newContacts, sub: `${totals.newContactFollowers} já seguem você`, icon: Users },
          ]
        : [];

    return (
        <div className="w-full max-w-5xl mx-auto space-y-4 pb-16">

            {/* Filter row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-heading font-semibold tracking-tight text-foreground">Análises</h1>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                        {account ? <>O que as automações de <span className="font-medium text-foreground">@{account.username}</span> realmente fizeram.</> : "O que suas automações realmente fizeram."}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={automationId}
                        onChange={(e) => setAutomationId(e.target.value)}
                        className="h-8 px-2.5 pr-7 text-[12.5px] font-medium bg-card border border-border rounded-lg outline-none focus:border-foreground/30 max-w-[220px] truncate"
                    >
                        <option value="all">Todas as automações</option>
                        {(data?.automations ?? []).map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>
                    <div className="inline-flex items-center bg-muted rounded-lg p-0.5">
                        {RANGES.map((r) => (
                            <button
                                key={r.label}
                                onClick={() => setRangeDays(r.days)}
                                className={cn(
                                    "h-7 px-3 rounded-[7px] text-[12px] font-medium transition-colors",
                                    rangeDays === r.days
                                        ? "bg-card text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {isLoading || !data ? (
                <div className="py-24 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    {data.truncated && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-[12px] font-medium text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Período muito grande - os números são calculados a partir dos primeiros 20.000 eventos.
                        </div>
                    )}

                    {/* Stat tiles */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {tiles.map((t) => (
                            <div key={t.label} className="bg-card border border-border rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <span className="micro-label">{t.label}</span>
                                    <t.icon className="w-3.5 h-3.5 text-muted-foreground/60" />
                                </div>
                                <p className="text-2xl font-heading font-semibold tracking-tight text-foreground mt-2 tabular-nums">
                                    {t.value.toLocaleString()}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Funnel */}
                    <div className="bg-card border border-border rounded-xl p-5">
                        <h2 className="text-[13.5px] font-heading font-semibold text-foreground mb-1">Funil de conversão</h2>
                        <p className="text-[11.5px] text-muted-foreground mb-4">Da ativação ao novo seguidor, neste período.</p>
                        <div className="space-y-2">
                            {funnel.map((f, i) => {
                                const pct = (f.value / funnelMax) * 100;
                                const prev = i > 0 ? funnel[i - 1]!.value : null;
                                const conv = prev && prev > 0 ? Math.round((f.value / prev) * 100) : null;
                                return (
                                    <div key={f.label} className="flex items-center gap-3">
                                        <span className="w-44 shrink-0 text-[12px] text-muted-foreground">{f.label}</span>
                                        <div className="flex-1 h-5 rounded-[4px] bg-muted/50 overflow-hidden">
                                            <div
                                                className="h-full rounded-[4px] transition-all duration-500"
                                                style={{ width: `${Math.max(pct, f.value > 0 ? 2 : 0)}%`, backgroundColor: colors.comments }}
                                            />
                                        </div>
                                        <span className="w-20 shrink-0 text-right text-[12.5px] font-semibold text-foreground tabular-nums">
                                            {f.value.toLocaleString()}
                                            {conv !== null && <span className="text-[10px] text-muted-foreground font-normal ml-1">{conv}%</span>}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Daily triggers - stacked bars */}
                    <div className="bg-card border border-border rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                            <div>
                                <h2 className="text-[13.5px] font-heading font-semibold text-foreground">Ativações por dia</h2>
                                <p className="text-[11.5px] text-muted-foreground mt-0.5">Comentários, palavras-chave em DM e respostas a stories que ativaram uma automação.</p>
                            </div>
                            <LegendRow items={[
                                { label: "Comentários", color: colors.comments },
                                { label: "Palavras-chave em DM", color: colors.dms },
                                { label: "Respostas a stories", color: colors.stories },
                            ]} />
                        </div>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.daily} margin={{ top: 4, right: 4, bottom: 0, left: -18 }} barCategoryGap="25%">
                                    <CartesianGrid stroke={gridStroke} vertical={false} />
                                    <XAxis dataKey="date" tickFormatter={fmtDay} tick={axisTick} axisLine={false} tickLine={false} minTickGap={28} />
                                    <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: gridStroke, opacity: 0.35 }} />
                                    <Bar dataKey="comments" name="Comentários" stackId="t" fill={colors.comments} stroke={surface} strokeWidth={1} />
                                    <Bar dataKey="dms" name="Palavras-chave em DM" stackId="t" fill={colors.dms} stroke={surface} strokeWidth={1} />
                                    <Bar dataKey="stories" name="Respostas a stories" stackId="t" fill={colors.stories} stroke={surface} strokeWidth={1} radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Deliveries + contacts - lines */}
                    <div className="bg-card border border-border rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                            <div>
                                <h2 className="text-[13.5px] font-heading font-semibold text-foreground">Entregas e novos contatos por dia</h2>
                                <p className="text-[11.5px] text-muted-foreground mt-0.5">DMs que chegaram às caixas de entrada e pessoas do público captadas pela primeira vez.</p>
                            </div>
                            <LegendRow items={[
                                { label: "DMs entregues", color: colors.delivered },
                                { label: "Novos contatos", color: colors.contacts },
                            ]} />
                        </div>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.daily} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                                    <CartesianGrid stroke={gridStroke} vertical={false} />
                                    <XAxis dataKey="date" tickFormatter={fmtDay} tick={axisTick} axisLine={false} tickLine={false} minTickGap={28} />
                                    <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: gridStroke }} />
                                    <Line type="monotone" dataKey="delivered" name="DMs entregues" stroke={colors.delivered} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="contacts" name="Novos contatos" stroke={colors.contacts} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Per-automation table */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-border">
                            <h2 className="text-[13.5px] font-heading font-semibold text-foreground">Por automação</h2>
                        </div>
                        {data.perAutomation.length === 0 ? (
                            <div className="p-10 text-center">
                                <ChartNoAxesColumn className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
                                <p className="text-[13px] text-muted-foreground">Nenhuma automação ainda - crie uma e os números começam a aparecer aqui.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="text-muted-foreground uppercase tracking-widest text-[10px] font-bold border-b border-border">
                                        <tr>
                                            <th className="px-5 py-2.5">Automação</th>
                                            <th className="px-5 py-2.5">Tipo</th>
                                            <th className="px-5 py-2.5 text-right">Ativações</th>
                                            <th className="px-5 py-2.5 text-right">Entregues</th>
                                            <th className="px-5 py-2.5 text-right">Fluxos concluídos</th>
                                            <th className="px-5 py-2.5 text-right">Seguidores</th>
                                            <th className="px-5 py-2.5 text-right">Falhas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {data.perAutomation.map((a) => {
                                            const TypeIcon = a.type === "dm_reply" ? Send : a.type === "story_reply" ? ImageIcon : MessageCircle;
                                            return (
                                                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", a.isActive ? "bg-secondary" : "bg-muted-foreground/30")} />
                                                            <span className="text-[13px] font-medium text-foreground truncate max-w-[220px]">{a.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                                                            <TypeIcon className="w-3 h-3" />
                                                            {a.type === "comment_dm" ? "Comentário" : a.type === "dm_reply" ? "DM" : "Story"}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right text-[13px] font-medium tabular-nums">{a.triggers.toLocaleString()}</td>
                                                    <td className="px-5 py-3 text-right text-[13px] tabular-nums">{a.delivered.toLocaleString()}</td>
                                                    <td className="px-5 py-3 text-right text-[13px] tabular-nums">{a.flowsCompleted.toLocaleString()}</td>
                                                    <td className="px-5 py-3 text-right text-[13px] tabular-nums">{a.follows.toLocaleString()}</td>
                                                    <td className={cn("px-5 py-3 text-right text-[13px] tabular-nums", a.failed > 0 ? "text-destructive font-medium" : "text-muted-foreground")}>{a.failed.toLocaleString()}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <p className="text-[11px] text-muted-foreground px-1">
                        &ldquo;Novos seguidores&rdquo; conta os fluxos de botão em que o cartão de pedir para seguir foi exibido e a pessoa
                        passou na nova verificação de seguidor. O status de seguidor do contato reflete a última verificação, não o histórico.
                    </p>
                </>
            )}
        </div>
    );
}
