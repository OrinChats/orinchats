export const AUTOMATION_TYPES = [
    {
        id: "comment-dm",
        name: "Comentário para DM",
        description: "Envie uma DM para quem comenta nas suas publicações ou reels.",
        iconType: "message",
        available: true,
        bg: "from-[#F97316]/20 to-[#fc9c54]/10",
        border: "group-hover:border-[#F97316]/50",
        iconColor: "text-[#F97316]"
    },
    {
        id: "dm-reply",
        name: "Resposta automática em DM",
        description: "Responda na hora a palavras-chave específicas nas suas DMs.",
        iconType: "send",
        available: true,
        bg: "from-blue-500/20 to-indigo-500/10",
        border: "group-hover:border-blue-500/50",
        iconColor: "text-blue-500"
    },
    {
        id: "story-reply",
        name: "Resposta a story",
        description: "Envie uma resposta automática quando alguém responder ao seu story.",
        iconType: "image",
        available: true,
        bg: "from-green-500/20 to-emerald-500/10",
        border: "group-hover:border-green-500/50",
        iconColor: "text-green-500"
    },
    {
        id: "story-mention",
        name: "Menção em story",
        description: "Recompense seguidores que mencionam você nos stories deles.",
        iconType: "at-sign",
        available: false,
        bg: "from-muted/20 to-muted/10",
        border: "border-border/50",
        iconColor: "text-muted-foreground"
    }
];
