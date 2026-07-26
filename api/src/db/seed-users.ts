import { parseArgs } from "node:util";
import { sql } from "../db/index.js";
import { listBatches, runSeed, wipeBatch } from "../seed-users/run.js";

const { values } = parseArgs({
  options: {
    region: { type: "string" },
    count: { type: "string", default: "200" },
    radius: { type: "string", default: "5" },
    seed: { type: "string" },
    "no-notes": { type: "boolean", default: false },
    list: { type: "boolean", default: false },
    wipe: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});

const USAGE = `Seed fake users into a region (tagged, wipeable).

  bun run db:seed:users -- --region "Hackney" --count 300 [--radius 4] [--seed 42] [--no-notes]
  bun run db:seed:users -- --list
  bun run db:seed:users -- --wipe hackney-20260725-ab12

Region accepts a place name ("Hackney", "Bristol"), a UK postcode ("E8 3PA"),
or an outcode ("E8"). Targets whatever DATABASE_URL points at.`;

async function main(): Promise<void> {
  if (values.help) {
    console.log(USAGE);
    return;
  }
  if (values.list) {
    const batches = await listBatches();
    if (batches.length === 0) console.log("no seed batches");
    for (const b of batches) console.log(`${b.batchId}\t${b.count} users`);
    return;
  }
  if (values.wipe) {
    const deleted = await wipeBatch(values.wipe);
    console.log(`wiped ${deleted} users from batch ${values.wipe}`);
    return;
  }
  if (!values.region) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  const result = await runSeed({
    region: values.region,
    count: Number(values.count),
    radiusKm: Number(values.radius),
    seed: values.seed,
    notes: !values["no-notes"],
  });
  console.log(
    `seeded ${result.count} users into "${result.regionLabel}" (${result.radiusKm} km radius)\n` +
      `batch: ${result.batchId}\n` +
      `postcodes resolved: ${result.postcodesResolved}/${result.count}, llm notes: ${result.notesAdded}\n` +
      `wipe with: bun run db:seed:users -- --wipe ${result.batchId}`,
  );
}

try {
  await main();
} finally {
  await sql.end();
}
