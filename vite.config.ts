import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { weatherResponse } from "./server/weather.ts";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "weather-proxy",
      configureServer(server) {
        server.middlewares.use("/api/weather", async (_request, response) => {
          const upstream = await weatherResponse();
          response.statusCode = upstream.status;
          response.setHeader("Content-Type", "application/json");
          response.end(await upstream.text());
        });
      },
    },
  ],
  build: { outDir: "dist/client" },
});
