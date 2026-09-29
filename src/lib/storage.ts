import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

// Image storage in a private S3 bucket. Objects are served through our own API
// routes, so the bucket never needs public access. The IAM user only needs
// s3:PutObject / GetObject / DeleteObject on `images/*`.
//
// Custom S3_* names (not AWS_*): Vercel presets AWS_REGION to the function's
// region, which may differ from the bucket's.

const globalForS3 = globalThis as unknown as { s3?: S3Client };

function config() {
  const { S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_REGION || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error("S3 is not configured: set S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY");
  }
  globalForS3.s3 ??= new S3Client({
    region: S3_REGION,
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });
  return { client: globalForS3.s3, bucket: S3_BUCKET };
}

/** One object per user, overwritten on change; `?v=` on the URL busts browser caches. */
export const avatarKey = (userId: string) => `images/avatars/${userId}`;

export async function putImage(key: string, body: Uint8Array, contentType: string) {
  const { client, bucket } = config();
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );
}

/** Returns the object as a stream, or null if it doesn't exist. */
export async function getImage(key: string) {
  const { client, bucket } = config();
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) return null;
    return {
      body: res.Body.transformToWebStream(),
      contentType: res.ContentType,
      contentLength: res.ContentLength,
    };
  } catch (e) {
    if (e instanceof NoSuchKey) return null;
    throw e;
  }
}

export async function deleteImage(key: string) {
  const { client, bucket } = config();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
