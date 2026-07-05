import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a static export (an `out/` folder of HTML/CSS/JS) so the FastAPI
  // backend can serve the frontend from the same origin inside one container.
  // `next dev` is unaffected by this setting.
  output: "export",
};

export default nextConfig;
