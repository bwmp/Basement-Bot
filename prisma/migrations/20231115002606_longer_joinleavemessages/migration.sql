-- AlterTable
ALTER TABLE `settings` MODIFY `leavemessage` LONGTEXT NOT NULL DEFAULT '{"message":"","channel":"false"}',
    MODIFY `joinmessage` LONGTEXT NOT NULL DEFAULT '{"message":"","channel":"false"}';
