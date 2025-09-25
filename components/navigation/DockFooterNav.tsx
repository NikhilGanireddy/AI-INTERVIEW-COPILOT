'use client';

import { useMemo } from 'react';
import { SignedIn, UserButton } from '@clerk/nextjs';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Bot, Video, Wand2, Volume2 } from 'lucide-react';

import Dock, { type DockItemConfig } from '@/components/ui/dock/Dock';

export default function DockFooterNav() {
  const pathname = usePathname();
  const router = useRouter();

  const items: DockItemConfig[] = useMemo(
    () => [
      { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { href: '/meeting', label: 'Meeting', icon: <Video size={20} /> },
      { href: '/copilot', label: 'Copilot', icon: <Bot size={20} /> },
      { href: '/voice/clone', label: 'Clone', icon: <Wand2 size={20} /> },
      { href: '/voice/tts', label: 'Text to Speech', icon: <Volume2 size={20} /> },
      {
        label: 'Profile',
        icon: (
          <UserButton
            appearance={{
              elements: {
                rootBox: 'h-full w-full flex items-center justify-center',
                userButtonAvatarBox: 'h-full w-full ring-1 ring-white/40',
              },
            }}
          />
        ),
      },
    ],
    []
  );

  return (
    <SignedIn>
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center">
        <Dock
          items={items.map((item) => ({
            ...item,
            onClick: item.href ? () => router.push(item.href) : item.onClick,
            className:
              item.href && pathname?.startsWith(item.href) ? 'dock-item--active' : item.className,
          }))}
          panelHeight={64}
          baseItemSize={46}
          magnification={70}
          className="pointer-events-auto px-3"
        />
      </div>
    </SignedIn>
  );
}
