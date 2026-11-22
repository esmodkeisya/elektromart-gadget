-- CreateTable
CREATE TABLE `reviews` (
    `id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NULL,
    `product_name` VARCHAR(255) NOT NULL,
    `order_id` CHAR(36) NULL,
    `order_item_id` CHAR(36) NULL,
    `buyer_id` CHAR(36) NULL,
    `reviewer_name` VARCHAR(255) NOT NULL,
    `rating` INTEGER NOT NULL DEFAULT 5,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `reviews_order_item_id_key`(`order_item_id`),
    INDEX `reviews_product_id_idx`(`product_id`),
    INDEX `reviews_buyer_id_idx`(`buyer_id`),
    INDEX `reviews_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
