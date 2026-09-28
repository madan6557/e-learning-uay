import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// This adapter is used only by the demo File Service. Authorization, expiring
// tickets and checksums remain in that service; the bucket stays private.
export async function createFileStorage(env = process.env) {
  const provider = env.FILE_STORAGE_PROVIDER ?? "local";
  if (provider === "s3") {
    const { S3Client, GetObjectCommand, PutObjectCommand, HeadBucketCommand } =
      await import("@aws-sdk/client-s3");
    const required = [
      "AWS_ENDPOINT_URL",
      "AWS_S3_BUCKET_NAME",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
    ];
    for (const name of required)
      if (!env[name]) throw new Error(`Missing ${name} for S3 storage`);
    const endpoint = new URL(env.AWS_ENDPOINT_URL);
    if (endpoint.protocol !== "https:")
      throw new Error("S3 storage requires HTTPS");
    const Bucket = env.AWS_S3_BUCKET_NAME;
    const client = new S3Client({
      endpoint: endpoint.href,
      region: env.AWS_DEFAULT_REGION ?? "auto",
      forcePathStyle: env.AWS_S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    await client.send(new HeadBucketCommand({ Bucket }));
    const key = (name) => `uay-demo-files/${name}`;
    return {
      provider,
      async read(name) {
        try {
          const result = await client.send(
            new GetObjectCommand({ Bucket, Key: key(name) }),
          );
          return Buffer.from(await result.Body.transformToByteArray());
        } catch (error) {
          if (error.$metadata?.httpStatusCode === 404) error.code = "ENOENT";
          throw error;
        }
      },
      async write(name, body, exclusive = false) {
        await client.send(
          new PutObjectCommand({
            Bucket,
            Key: key(name),
            Body: body,
            ContentType: name.endsWith(".json")
              ? "application/json"
              : "application/octet-stream",
            ...(exclusive ? { IfNoneMatch: "*" } : {}),
          }),
        );
      },
    };
  }
  if (provider !== "local") throw new Error("Unknown FILE_STORAGE_PROVIDER");
  const root = resolve(
    env.FILE_SERVICE_DATA_DIRECTORY ?? ".local/file-service",
  );
  await mkdir(root, { recursive: true });
  return {
    provider,
    read: (name) => readFile(resolve(root, name)),
    write: (name, body, exclusive = false) =>
      writeFile(resolve(root, name), body, exclusive ? { flag: "wx" } : {}),
  };
}
