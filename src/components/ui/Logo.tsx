/**
 * OrinChats logo - an orange with chat bubbles inside.
 * Used in the sidebar, login page and favicon.
 */

import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="OrinChats logo"
      draggable={false}
      className={cn('w-8 h-8 object-contain select-none', className)}
    />
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-heading font-extrabold tracking-tight', className)}>
      <span className="text-primary">orin</span>
      <span className="text-foreground">chats</span>
    </span>
  );
}
