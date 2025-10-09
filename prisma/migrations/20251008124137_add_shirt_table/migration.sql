-- CreateTable
CREATE TABLE "Shirt" (
    "id" SERIAL NOT NULL,
    "shirt_name" TEXT NOT NULL,
    "shirt_size" TEXT NOT NULL,
    "shirt_color" TEXT NOT NULL,
    "shirt_price" DOUBLE PRECISION NOT NULL,
    "shirt_image" TEXT,

    CONSTRAINT "Shirt_pkey" PRIMARY KEY ("id")
);
