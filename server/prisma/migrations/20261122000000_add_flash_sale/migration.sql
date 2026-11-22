-- AlterTable
ALTER TABLE `products`
    ADD COLUMN `is_flash_sale` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `flash_sale_quota` INTEGER NOT NULL DEFAULT 0,
    ADD INDEX `products_is_flash_sale_idx`(`is_flash_sale`);
