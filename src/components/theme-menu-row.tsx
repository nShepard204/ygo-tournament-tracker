"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/use-theme";
import { THEMES, type Theme } from "@/lib/theme";

const THEME_META: Record<Theme, { label: string; Icon: typeof Sun }> = {
  system: { label: "System", Icon: Monitor },
  light: { label: "Light", Icon: Sun },
  dark: { label: "Dark", Icon: Moon },
};

// A single dropdown row holding a segmented System/Light/Dark control.
// Must be rendered inside a <DropdownMenuContent>.
export function ThemeMenuRow() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center justify-between gap-2 px-1.5 py-1">
      <span className="text-sm">Theme</span>
      {/* Radio items: arrow-key navigable, and Base UI marks the selected one with data-checked */}
      <MenuPrimitive.RadioGroup
        value={theme}
        onValueChange={(value: Theme) => setTheme(value)}
        aria-label="Theme"
        className="flex gap-0.5 rounded-md bg-muted p-0.5"
      >
        {THEMES.map((value) => {
          const { label, Icon } = THEME_META[value];
          return (
            <MenuPrimitive.RadioItem
              key={value}
              value={value}
              closeOnClick={false}
              aria-label={label}
              title={label}
              className="flex size-7 cursor-default items-center justify-center rounded-sm text-muted-foreground outline-none select-none data-highlighted:text-foreground data-checked:bg-background data-checked:text-foreground data-checked:shadow-sm data-highlighted:ring-2 data-highlighted:ring-ring/50"
            >
              <Icon className="size-4" />
            </MenuPrimitive.RadioItem>
          );
        })}
      </MenuPrimitive.RadioGroup>
    </div>
  );
}
