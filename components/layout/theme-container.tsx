"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Base UI portals (Select, DropdownMenu, AlertDialog, ...) render to
 * `document.body` by default, which escapes the `.theme-admin` class scope
 * that our CSS custom properties (--primary, --accent, ...) rely on — a
 * portaled popup would silently fall back to the public/student theme's
 * colors. This context exposes the nearest themed ancestor element so those
 * wrappers can pass it as their `container` and stay inside the right scope.
 */
const ThemeContainerContext = createContext<HTMLElement | null>(null);

export function useThemeContainer() {
  return useContext(ThemeContainerContext);
}

export function ThemeContainerProvider({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  return (
    <div ref={setContainer} className={className}>
      <ThemeContainerContext.Provider value={container}>
        {children}
      </ThemeContainerContext.Provider>
    </div>
  );
}
