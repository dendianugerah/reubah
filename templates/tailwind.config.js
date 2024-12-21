/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.html",
    "./pages/**/*.html",
    "./index.html",
    "./js/**/*.js",
    "../static/js/**/*.js"
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          light: '#6366F1',
          lighter: '#818CF8',
          darker: '#4F46E5',
        },
        
        success: {
          light: '#10B981',
          dark: '#059669',
        },
        warning: {
          light: '#F59E0B',
          dark: '#B45309',
        },
        error: {
            light: '#EF4444',
            dark: '#DC2626',
        },
        backgroundColor: {
          'darkSurface/90': 'rgb(24 24 27 / 0.9)',
          'darkSurface/50': 'rgb(24 24 27 / 0.5)',
          'darkAccent/10': 'rgb(0 112 243 / 0.1)',
          'accent-light/10': 'rgb(99 102 241 / 0.1)',
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        darkBg: '#0A0A0A',
        darkSurface: '#1A1A1A',
        darkSurfaceHover: '#242424',
        darkBorder: '#2E2E2E',
        darkTextPrimary: '#FFFFFF',
        darkTextSecondary: '#A0A0A0',
        darkAccent: '#3B82F6',
        darkAccentHover: '#2563EB',
        darkInput: '#2A2A2A',
        darkInputHover: '#333333',
        darkInputFocus: '#404040',
        
        darkDisabled: {
          bg: '#1C1C1C',
          text: '#666666',
          border: '#333333'
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "shine-pulse": {
          "0%": {
            "background-position": "0% 0%",
          },
          "50%": {
            "background-position": "100% 100%",
          },
          to: {
            "background-position": "0% 0%",
          },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        marquee: "marquee var(--duration) linear infinite",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
      },
    },
  },
  plugins: [],
}