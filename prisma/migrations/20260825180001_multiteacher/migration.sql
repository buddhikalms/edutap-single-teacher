-- AlterTable
ALTER TABLE `readerdevice` MODIFY `type` ENUM('NFC', 'QR', 'FINGERPRINT', 'BOTH') NOT NULL DEFAULT 'BOTH';
