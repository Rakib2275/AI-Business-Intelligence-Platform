CREATE TABLE "ProductOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" "PamentStatus" NOT NULL DEFAULT 'UNPAID',
    "merchantInvoiceNumber" TEXT NOT NULL,
    "bkashPaymentId" TEXT,
    "bkashTrxId" TEXT,
    "paidAt" TIMESTAMP(3),
    "gatewayResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductOrder_merchantInvoiceNumber_key" ON "ProductOrder"("merchantInvoiceNumber");
CREATE UNIQUE INDEX "ProductOrder_bkashPaymentId_key" ON "ProductOrder"("bkashPaymentId");
CREATE INDEX "ProductOrder_userId_createdAt_idx" ON "ProductOrder"("userId", "createdAt");
CREATE INDEX "ProductOrder_productId_idx" ON "ProductOrder"("productId");

ALTER TABLE "ProductOrder"
ADD CONSTRAINT "ProductOrder_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductOrder"
ADD CONSTRAINT "ProductOrder_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
