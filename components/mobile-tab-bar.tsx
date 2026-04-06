"use client";

import { LucideIcon } from "lucide-react";

interface MobileTabBarProps {
  items: {
    id: string;
    label: string;
    icon: LucideIcon;
  }[];
  activeTab: string;
  onSelect: (tab: string) => void;
}

export function MobileTabBar({ items, activeTab, onSelect }: MobileTabBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur xl:hidden">
      <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto pb-[max(env(safe-area-inset-bottom),0px)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`flex min-h-[60px] min-w-[78px] shrink-0 flex-col items-center justify-center rounded-2xl px-3 py-2 text-[11px] font-medium transition ${
                isActive ? "bg-brand-600 text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Icon className="mb-1 h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
