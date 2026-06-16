import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP_DIR = path.join(ROOT, "src", "app");

const svgPath = path.join(APP_DIR, "icon.svg");
const appleIconPath = path.join(APP_DIR, "apple-icon.png");
const faviconIcoPath = path.join(APP_DIR, "favicon.ico");

// Temp files
const tmpDir = path.join(ROOT, "scripts", "tmp");

async function generateIcons() {
  await fs.mkdir(tmpDir, { recursive: true });

  const svg = await fs.readFile(svgPath);

  // Apple icon: 180x180
  await sharp(svg)
    .resize(180, 180)
    .png()
    .toFile(appleIconPath);
  console.log("✓ apple-icon.png (180x180)");

  // Generate multiple sizes for ICO
  const sizes = [16, 32, 48];
  const pngPaths = [];

  for (const size of sizes) {
    const pngPath = path.join(tmpDir, `favicon-${size}.png`);
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(pngPath);
    pngPaths.push(pngPath);
    console.log(`✓ Generated ${size}x${size} PNG`);
  }

  // Create multi-resolution ICO
  const icoBuffer = await pngToIco(pngPaths);
  await fs.writeFile(faviconIcoPath, icoBuffer);
  console.log("✓ favicon.ico (multi-size: 16/32/48)");

  // Clean up temp files
  for (const p of pngPaths) {
    await fs.rm(p, { force: true });
  }
  await fs.rmdir(tmpDir).catch(() => {});

  console.log("\nAll icons generated successfully in src/app/");
}

generateIcons().catch((error) => {
  console.error("Icon generation failed:", error);
  process.exit(1);
});
