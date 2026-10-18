# Private document files: bucket policy step for existing instances

From this release, NextCRM serves document files only through
`/api/documents/<id>/file`: the user must be signed in and allowed to read the
document, and the browser gets a presigned link that expires after 5 minutes.

A new install creates the bucket with anonymous read on `avatars/` only.
**An existing install keeps its old policy**, which allows anonymous read on
`documents/`, `images/`, `uploads/` and `thumbnails/`. Until you change it,
anyone with an old direct MinIO link can still open the file. The app never
changes an existing bucket policy, so do this once per instance after the
upgrade.

## Steps

Run in the NextCRM **app** container (it has `curl` and the `MINIO_*` env
vars), e.g. Coolify → app service → Terminal, or `docker compose exec app sh`:

```sh
B="$MINIO_ENDPOINT/$MINIO_BUCKET"; AUTH="$MINIO_ACCESS_KEY:$MINIO_SECRET_KEY"
# 1. current policy: keep the output in case you need to roll back
curl -s "$B?policy=" --aws-sigv4 "aws:amz:us-east-1:s3" -u "$AUTH"; echo
# 2. replace it: anonymous read on avatars/ only (expect 204)
curl -s -o /dev/null -w "PUT policy: %{http_code}\n" -X PUT "$B?policy=" \
  -H "Content-Type: application/json" --aws-sigv4 "aws:amz:us-east-1:s3" -u "$AUTH" \
  --data "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":[\"*\"]},\"Action\":[\"s3:GetObject\"],\"Resource\":[\"arn:aws:s3:::$MINIO_BUCKET/avatars/*\"]}]}"
# 3. check
curl -s "$B?policy=" --aws-sigv4 "aws:amz:us-east-1:s3" -u "$AUTH"; echo
```

## Check

- An old direct link `https://<minio-domain>/<bucket>/documents/...` returns `AccessDenied`.
- The same document still opens in NextCRM (Documents → View file).
- Profile photos still show.

## Effect

- Direct MinIO links to documents that were copied out of the app (emails,
  bookmarks) stop working; inside the app everything goes through the route.
- Invoice PDFs were already private and are unchanged.

## Rollback

PUT the JSON you saved in step 1 the same way as step 2.
