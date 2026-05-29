import { useTheme } from "@notux/ui";

/** Sun / moon button that flips the app between light and dark Liquid Glass. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      className={"tool-tray__btn" + (className ? ` ${className}` : "")}
      onClick={toggle}
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
      aria-label="Toggle light / dark theme"
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
