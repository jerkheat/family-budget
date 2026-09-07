module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sber: {
          green: "#21A038",
          dark: "#1A8630",
          light: "#E6F7EA",
          gray: "#F5F7FA",
          text: "#1F2937",
          muted: "#6B7280",
        }
      },
      boxShadow: {
        soft: "0 4px 20px rgba(33, 160, 56, 0.08)",
        card: "0 2px 8px rgba(0, 0, 0, 0.04)",
      }
    }
  },
  plugins: [],
}
