ALTER TABLE "User"
ADD COLUMN "username" TEXT,
ADD COLUMN "passwordChangeRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "businessProfile" JSONB;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

ALTER TABLE "Product"
ADD COLUMN "sellerId" TEXT;

CREATE INDEX "Product_sellerId_createdAt_idx" ON "Product"("sellerId", "createdAt");

ALTER TABLE "Product"
ADD CONSTRAINT "Product_sellerId_fkey"
FOREIGN KEY ("sellerId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
