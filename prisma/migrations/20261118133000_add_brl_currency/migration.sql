INSERT INTO "Currency" ("code", "name", "symbol", "isEnabled", "isDefault", "createdAt", "updatedAt")
VALUES ('BRL', 'Brazilian Real', 'R$', true, false, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;
