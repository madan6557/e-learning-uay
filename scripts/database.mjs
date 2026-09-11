import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { setDefaultResultOrder } from "node:dns";
setDefaultResultOrder("ipv4first");
const directory = resolve(".local/postgres");
mkdirSync(directory, { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir: directory,
  user: "uay",
  password: "uay_local_only",
  port: 55432,
  persistent: true,
  authMethod: "scram-sha-256",
  postgresFlags: ["-h", "127.0.0.1"],
});
if (!existsSync(resolve(directory, "PG_VERSION"))) await pg.initialise();
await pg.start();
const client = pg.getPgClient("postgres", "127.0.0.1");
await client.connect();
for (const name of ["elearning", "elearning_test"])
  if (
    !(await client.query("SELECT 1 FROM pg_database WHERE datname=$1", [name]))
      .rowCount
  )
    await client.query(`CREATE DATABASE ${name}`);
await client.end();
console.log(
  "PostgreSQL 16 ready at 127.0.0.1:55432 (persistent local development data).",
);
let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  await pg.stop();
  process.exit();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 60000);
