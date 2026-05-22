-- CreateEnum
CREATE TYPE "MutationType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN');

-- CreateTable
CREATE TABLE "stock_mutations" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "type" "MutationType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "before_stock" INTEGER NOT NULL,
    "after_stock" INTEGER NOT NULL,
    "reference_id" TEXT NOT NULL,
    "reference_type" "ReferenceType" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_mutations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_mutations_product_id_idx" ON "stock_mutations"("product_id");

-- CreateIndex
CREATE INDEX "stock_mutations_branch_id_idx" ON "stock_mutations"("branch_id");

-- CreateIndex
CREATE INDEX "stock_mutations_created_at_idx" ON "stock_mutations"("created_at");

-- AddForeignKey
ALTER TABLE "stock_mutations" ADD CONSTRAINT "stock_mutations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_mutations" ADD CONSTRAINT "stock_mutations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
