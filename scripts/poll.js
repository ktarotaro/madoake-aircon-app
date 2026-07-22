import { mkdir, writeFile } from "node:fs/promises";
import { getMeterStatus } from "../src/switchbotClient.js";
import { getAmedasStatus } from "../src/weatherClient.js";
import { decide } from "../src/logic.js";
import { config } from "../src/config.js";

const token = process.env.SWITCHBOT_TOKEN;
const secret = process.env.SWITCHBOT_SECRET;

if (!token || !secret) {
  console.error("SWITCHBOT_TOKEN / SWITCHBOT_SECRET が設定されていません。");
  process.exit(1);
}

const indoor = await getMeterStatus({ token, secret, deviceId: config.switchbotDeviceId });
const outdoorRaw = await getAmedasStatus({ stationId: config.amedasStationId });

const outdoor = { temperature: outdoorRaw.temperature, humidity: outdoorRaw.humidity };

const result = decide({
  indoor,
  outdoor,
  precipitation10m: outdoorRaw.precipitation10m,
  alpha: config.alpha,
});

const output = {
  updatedAt: new Date().toISOString(),
  indoor,
  outdoor: { ...outdoor, observedAt: outdoorRaw.observedAt },
  ...result,
};

await mkdir("data", { recursive: true });
await writeFile("data/latest.json", JSON.stringify(output, null, 2) + "\n");

console.log(JSON.stringify(output, null, 2));
