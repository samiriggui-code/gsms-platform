-- GSMS : étapes d'affaire du métier (prospect → qualification → visite / analyse du besoin → devis envoyé →
-- négociation → gagné / perdu / sans suite). Renommage sur place : les affaires existantes gardent leur étape.
ALTER TYPE "DealStage" RENAME VALUE 'DEMO_BOOKED' TO 'PROSPECT';
ALTER TYPE "DealStage" RENAME VALUE 'QUALIFIED_TO_BUY' TO 'QUALIFICATION';
ALTER TYPE "DealStage" RENAME VALUE 'UNQUALIFIED_TO_BUY' TO 'NOT_QUALIFIED';
ALTER TYPE "DealStage" RENAME VALUE 'DECISION_MAKER_BOUGHT_IN' TO 'NEEDS_ANALYSIS';
ALTER TYPE "DealStage" RENAME VALUE 'CONTRACT_SENT' TO 'QUOTE_SENT';
ALTER TYPE "DealStage" ADD VALUE IF NOT EXISTS 'NEGOTIATION' AFTER 'QUOTE_SENT';

-- Affaires en euros par défaut (les montants existants gardent leur devise).
ALTER TABLE "deal" ALTER COLUMN "currency" SET DEFAULT 'EUR';
