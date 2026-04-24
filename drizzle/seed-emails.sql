-- Seed placeholder emails for Jaquez family users
-- Format: firstname@kintocare.test

UPDATE users SET email = 'pedro@kintocare.test' WHERE name = 'Pedro' AND email IS NULL;
UPDATE users SET email = 'ysel@kintocare.test' WHERE name = 'Ysel' AND email IS NULL;
UPDATE users SET email = 'alberto@kintocare.test' WHERE name = 'Alberto' AND email IS NULL;
UPDATE users SET email = 'kevin@kintocare.test' WHERE name = 'Kevin' AND email IS NULL;
UPDATE users SET email = 'pedroalberto@kintocare.test' WHERE name = 'Pedro Alberto' AND email IS NULL;
UPDATE users SET email = 'gloria@kintocare.test' WHERE name = 'Gloria' AND email IS NULL;
