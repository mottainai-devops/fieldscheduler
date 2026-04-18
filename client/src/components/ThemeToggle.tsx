import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    if (newTheme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }

    // Update CSS variables for light theme
    if (newTheme === "light") {
      root.style.setProperty("--background", "oklch(0.98 0.002 247.858)");
      root.style.setProperty("--foreground", "oklch(0.161 0.007 247.858)");
      root.style.setProperty("--card", "oklch(0.97 0.001 0)");
      root.style.setProperty("--card-foreground", "oklch(0.161 0.007 247.858)");
      root.style.setProperty("--popover", "oklch(0.97 0.001 0)");
      root.style.setProperty("--popover-foreground", "oklch(0.161 0.007 247.858)");
      root.style.setProperty("--muted", "oklch(0.96 0.001 0)");
      root.style.setProperty("--muted-foreground", "oklch(0.44 0.008 247.858)");
      root.style.setProperty("--accent", "oklch(0.5 0.16 142.495)");
      root.style.setProperty("--accent-foreground", "oklch(0.98 0.002 247.858)");
      root.style.setProperty("--destructive", "oklch(0.577 0.245 27.325)");
      root.style.setProperty("--destructive-foreground", "oklch(0.98 0.002 247.858)");
      root.style.setProperty("--border", "oklch(0.96 0.001 0)");
      root.style.setProperty("--input", "oklch(0.96 0.001 0)");
      root.style.setProperty("--ring", "oklch(0.5 0.16 142.495)");
    } else {
      // Dark theme - reset to default dark values
      root.style.removeProperty("--background");
      root.style.removeProperty("--foreground");
      root.style.removeProperty("--card");
      root.style.removeProperty("--card-foreground");
      root.style.removeProperty("--popover");
      root.style.removeProperty("--popover-foreground");
      root.style.removeProperty("--muted");
      root.style.removeProperty("--muted-foreground");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-foreground");
      root.style.removeProperty("--destructive");
      root.style.removeProperty("--destructive-foreground");
      root.style.removeProperty("--border");
      root.style.removeProperty("--input");
      root.style.removeProperty("--ring");
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="text-slate-300 h-auto p-2" disabled>
        <Sun className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="text-slate-300 hover:text-white hover:bg-slate-700 h-auto p-2 transition-colors"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5 text-blue-400" />
      )}
    </Button>
  );
}

