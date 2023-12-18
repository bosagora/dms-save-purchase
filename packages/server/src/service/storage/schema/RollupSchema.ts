/**
 *  The Schema of Rollup Storage
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
    height INTEGER PRIMARY KEY,
    cur_block TEXT,
    prev_block TEXT,
    merkle_root TEXT,
    "timestamp" INTEGER,
    CID TEXT
  );
  CREATE INDEX IF NOT EXISTS curBlockHashIndex on blocks (cur_block);

  CREATE TABLE IF NOT EXISTS tx(
    sequence INTEGER PRIMARY KEY,
    trade_id TEXT,
    user_id TEXT,
    "state" TEXT,
    amount TEXT,
    "timestamp" INTEGER,
    exchange_user_id TEXT,
    exchange_id TEXT,
    signer TEXT,
    signature TEXT,
    hash TEXT
  );
  CREATE INDEX IF NOT EXISTS txHashIndex on tx (hash);

  CREATE TABLE IF NOT EXISTS setting(
    "key" TEXT PRIMARY KEY,
    "value" TEXT
  );
`;

export const insertBlockQuery = `
  INSERT INTO blocks(
      height,
      cur_block,
      prev_block,
      merkle_root,
      "timestamp",
      CID
    ) VALUES (?,?,?,?,?,?)
`;

export const insertTxQuery = `
  INSERT OR REPLACE INTO tx(
    sequence,
    trade_id,
    user_id,
    "state",
    amount,
    "timestamp",
    exchange_user_id,
    exchange_id,
    signer,
    signature,
    hash
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
`;

export const selectBlockByHeightQuery = `
    SELECT * FROM blocks WHERE height = ?
`;

export const selectBlockLastHeight = `
    SELECT MAX(height) as height FROM blocks
`;

export const selectBlockByHashQuery = `
    SELECT * FROM blocks WHERE cur_block = ?
`;

export const deleteBlockByHeightQuery = `
    DELETE FROM blocks WHERE height < ?
`;

export const deleteTxByHashQuery = `
    DELETE FROM tx WHERE hash = ?
`;

export const selectTxByHashQuery = `
    SELECT * FROM tx WHERE hash = ?
`;

export const selectTxByLengthQuery = `
    SELECT * FROM tx ORDER BY sequence ASC LIMIT ?
`;

export const selectTxsLength = `
    SELECT COUNT(sequence) as count FROM tx
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
