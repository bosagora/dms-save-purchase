/**
 *  The Schema of StorePurchase Storage
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

export const dropTablesQuery = `
    DROP TABLE IF EXISTS blocks;
    DROP TABLE IF EXISTS tx;
`;

export const createTablesQuery = `
  CREATE TABLE IF NOT EXISTS blocks(
    "height" INTEGER PRIMARY KEY,
    "curBlock" TEXT,
    "prevBlock" TEXT,
    "merkleRoot" TEXT,
    "timestamp" INTEGER,
    CID TEXT
  );
  CREATE INDEX IF NOT EXISTS curBlockHashIndex on blocks (curBlock);

  CREATE TABLE IF NOT EXISTS txs (
    "sequence" INTEGER PRIMARY KEY,
    "contents" TEXT,
    "hash" TEXT
  );
  CREATE INDEX IF NOT EXISTS txHashIndex on txs (hash);

  CREATE TABLE IF NOT EXISTS setting(
    "key" TEXT PRIMARY KEY,
    "value" TEXT
  );
`;

export const insertBlockQuery = `
  INSERT INTO blocks(
      "height",
      "curBlock",
      "prevBlock",
      "merkleRoot",
      "timestamp",
      CID
    ) VALUES (?,?,?,?,?,?)
`;

export const insertTxQuery = `
  INSERT OR REPLACE INTO txs (
    "sequence",
    "contents",
    "hash"
    ) VALUES (?,?,?)
`;

export const selectBlockByHeightQuery = `
    SELECT * FROM blocks WHERE height = ?
`;

export const selectBlockLastHeight = `
    SELECT MAX(height) as height FROM blocks
`;

export const selectBlockByHashQuery = `
    SELECT * FROM blocks WHERE curBlock = ?
`;

export const deleteBlockByHeightQuery = `
    DELETE FROM blocks WHERE height < ?
`;

export const deleteTxByHashQuery = `
    DELETE FROM txs WHERE hash = ?
`;

export const selectTxByHashQuery = `
    SELECT * FROM txs WHERE hash = ?
`;

export const selectTxByLengthQuery = `
    SELECT * FROM txs ORDER BY sequence ASC LIMIT ?
`;

export const selectTxsLength = `
    SELECT COUNT(sequence) as count FROM txs
`;

export const getSetting = `
    SELECT * FROM setting WHERE "key" = ?
`;

export const setSetting = `
    INSERT OR REPLACE INTO setting
        ( "key", "value" )
    VALUES
        ( ?, ? )
`;
