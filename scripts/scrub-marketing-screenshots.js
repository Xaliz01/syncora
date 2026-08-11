const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const DIR = path.join(__dirname, "../apps/frontend/public/marketing");
const COVER = { r: 248, g: 250, b: 252 }; // slate-50

async function scrubFile(file, isMobile) {
  const filePath = path.join(DIR, file);
  const meta = await sharp(filePath).metadata();
  const { width, height } = meta;
  const composites = [];

  if (!isMobile) {
    const org = { left: 12, top: 52, width: 188, height: 40 };
    composites.push({
      input: await sharp(filePath).extract(org).blur(18).toBuffer(),
      left: org.left,
      top: org.top,
    });
  }

  // Crisp FAB sits in the extreme bottom-right; cover a fixed pad to the edges.
  const size = isMobile ? 88 : 78;
  const margin = isMobile ? 8 : 6;
  const left = width - size - margin;
  const top = height - size - margin;
  const coverW = width - left;
  const coverH = height - top;
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${coverW}" height="${coverH}">
      <rect width="100%" height="100%" fill="rgb(${COVER.r},${COVER.g},${COVER.b})"/>
    </svg>`
  );
  composites.push({ input: svg, left, top });

  await sharp(filePath)
    .composite(composites)
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(filePath + ".tmp");
  fs.renameSync(filePath + ".tmp", filePath);
  console.log(file, { left, top, coverW, coverH });
}

(async () => {
  await scrubFile("screenshot-planning.jpg", false);
  await scrubFile("screenshot-dashboard.jpg", false);
  await scrubFile("screenshot-dossier.jpg", false);
  await scrubFile("screenshot-my-day.jpg", true);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
