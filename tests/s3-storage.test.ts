import test from "node:test";
import assert from "node:assert/strict";
import { config } from "../apps/api/src/core.js";
import {
  getS3Client,
  resetS3Client,
  getS3ObjectKey,
  createSignedDownloadToken,
  verifySignedDownloadToken,
} from "../apps/api/src/files.js";

test("S3 Storage: configuration and auto-detection", () => {
  const origMode = config.fileMode;
  const origBucket = config.s3Bucket;
  const origEndpoint = config.s3Endpoint;
  const origAccessKey = config.s3AccessKeyId;
  const origSecretKey = config.s3SecretAccessKey;
  const origRegion = config.s3Region;
  const origUrl = config.fileUrl;
  const origKey = config.fileKey;

  try {
    // 1. Tigris / Railway S3 credentials from user screenshot
    config.fileUrl = "";
    config.fileKey = "";
    config.s3Endpoint = "https://t3.storageapi.dev";
    config.s3Bucket = "arranged-lounge-j7sbw8iq1";
    config.s3Region = "auto";
    config.s3AccessKeyId = "tid_zImBpKfObONAYpHBoICnphxCNDKgcIbhCRWjkcPiaHWpnvTAfT";
    config.s3SecretAccessKey = "dummy_secret_key_for_test";

    assert.equal(config.fileMode, "s3");
    assert.equal(config.s3Endpoint, "https://t3.storageapi.dev");
    assert.equal(config.s3Bucket, "arranged-lounge-j7sbw8iq1");
    assert.equal(config.s3Region, "auto");
    assert.equal(config.s3ForcePathStyle, true);

    // Verify S3 object key helper
    const testId = "12345678-abcd-ef01-2345-6789abcdef01";
    assert.equal(getS3ObjectKey(testId), `uploads/${testId}.bin`);

    // Verify client initialization
    resetS3Client();
    const client = getS3Client();
    assert.ok(client);

    // Verify signed download token generation & verification for S3
    const token = createSignedDownloadToken(testId, 60);
    assert.ok(token.includes("."));
    assert.equal(verifySignedDownloadToken(testId, token), true);
    assert.equal(verifySignedDownloadToken("different-id", token), false);
  } finally {
    config.fileUrl = origUrl;
    config.fileKey = origKey;
    config.s3Bucket = origBucket;
    config.s3Endpoint = origEndpoint;
    config.s3AccessKeyId = origAccessKey;
    config.s3SecretAccessKey = origSecretKey;
    config.s3Region = origRegion;
    resetS3Client();
  }
});
