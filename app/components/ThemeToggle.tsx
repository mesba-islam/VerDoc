"use client";
import { useEffect, useState } from "react";
import { MoonStar, Sun } from "lucide-react"; // Import Lucide icons

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newTheme = darkMode ? "light" : "dark";
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-md border border-border text-secondary-foreground flex items-center gap-2"
    >
      {darkMode ? <MoonStar className="w-5 h-5" /> : <Sun className="w-5 h-5 text-cyan-400"/>} 
      {darkMode ? "" : ""}
    </button>
  );
}
