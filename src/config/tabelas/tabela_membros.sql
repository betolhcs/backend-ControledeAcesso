DROP TABLE IF EXISTS "membros" CASCADE;


CREATE TABLE "membros"(
  "nome" VARCHAR(50) NOT NULL,
  "cargo" VARCHAR (50) NOT NULL,
  "matricula" CHAR (9) UNIQUE NOT NULL,
  "rfid" CHAR (5) UNIQUE NOT NULL,
  "id" SERIAL PRIMARY KEY
);