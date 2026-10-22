-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `user_metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profiles` (
    `id` CHAR(36) NOT NULL,
    `role` ENUM('buyer', 'seller', 'admin') NOT NULL DEFAULT 'buyer',
    `job_title` VARCHAR(120) NULL,
    `full_name` VARCHAR(255) NULL,
    `username` VARCHAR(120) NULL,
    `store_name` VARCHAR(255) NULL,
    `phone` VARCHAR(32) NULL,
    `store_address` TEXT NULL,
    `avatar_url` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_of_birth` DATE NULL,
    `gender` VARCHAR(20) NULL,
    `bio` TEXT NULL,
    `account_status` VARCHAR(20) NULL DEFAULT 'active',
    `seller_status` VARCHAR(20) NULL,
    `store_description` TEXT NULL,
    `store_banner_url` TEXT NULL,
    `operating_hours` JSON NULL,

    INDEX `profiles_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipping_addresses` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `label` VARCHAR(20) NOT NULL DEFAULT 'home',
    `recipient` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `address` TEXT NOT NULL,
    `city` VARCHAR(120) NOT NULL,
    `province` VARCHAR(120) NOT NULL DEFAULT 'Jawa Timur',
    `postal` VARCHAR(20) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `shipping_addresses_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `color` VARCHAR(20) NULL DEFAULT '#1a3fd6',
    `icon` VARCHAR(60) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `subcategories` JSON NULL,
    `attributes` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` CHAR(36) NOT NULL,
    `seller_id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `sku` VARCHAR(120) NULL,
    `category` VARCHAR(120) NULL,
    `description` TEXT NULL,
    `price` INTEGER NOT NULL DEFAULT 0,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(30) NOT NULL DEFAULT 'active',
    `image_url` TEXT NULL,
    `images` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `products_seller_id_idx`(`seller_id`),
    UNIQUE INDEX `products_seller_id_name_key`(`seller_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` CHAR(36) NOT NULL,
    `buyer_id` CHAR(36) NOT NULL,
    `order_number` VARCHAR(60) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'waiting_payment',
    `payment_method` VARCHAR(120) NULL,
    `payment_group` VARCHAR(60) NULL,
    `courier` VARCHAR(120) NULL,
    `shipping_address` JSON NULL,
    `subtotal` INTEGER NOT NULL DEFAULT 0,
    `product_fee` INTEGER NOT NULL DEFAULT 0,
    `insurance_fee` INTEGER NOT NULL DEFAULT 0,
    `shipping_fee` INTEGER NOT NULL DEFAULT 0,
    `total` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `orders_order_number_key`(`order_number`),
    INDEX `orders_buyer_id_idx`(`buyer_id`),
    INDEX `orders_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` CHAR(36) NOT NULL,
    `order_id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NULL,
    `seller_id` CHAR(36) NULL,
    `product_name` VARCHAR(255) NOT NULL,
    `product_image` TEXT NULL,
    `price` INTEGER NOT NULL DEFAULT 0,
    `qty` INTEGER NOT NULL DEFAULT 1,
    `subtotal` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_items_order_id_idx`(`order_id`),
    INDEX `order_items_seller_id_idx`(`seller_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NULL,
    `seller_id` CHAR(36) NULL,
    `reporter_id` CHAR(36) NULL,
    `product_name` VARCHAR(255) NOT NULL,
    `product_image` TEXT NULL,
    `reason` VARCHAR(120) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `reports_seller_id_idx`(`seller_id`),
    INDEX `reports_status_idx`(`status`),
    INDEX `reports_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_accounts` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `type` VARCHAR(20) NOT NULL DEFAULT 'account',
    `bank_name` VARCHAR(120) NOT NULL,
    `account_name` VARCHAR(255) NOT NULL,
    `account_number` VARCHAR(60) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bank_accounts_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversations` (
    `id` CHAR(36) NOT NULL,
    `buyer_id` CHAR(36) NOT NULL,
    `seller_id` CHAR(36) NOT NULL,
    `buyer_last_read_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `seller_last_read_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `conversations_buyer_id_idx`(`buyer_id`),
    INDEX `conversations_seller_id_idx`(`seller_id`),
    UNIQUE INDEX `conversations_buyer_id_seller_id_key`(`buyer_id`, `seller_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` CHAR(36) NOT NULL,
    `conversation_id` CHAR(36) NOT NULL,
    `sender_id` CHAR(36) NOT NULL,
    `text` TEXT NULL,
    `attachment` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `messages_conversation_id_idx`(`conversation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
