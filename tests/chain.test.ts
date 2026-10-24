import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RpcProvider, type Abi } from 'starknet';
import { practiceAbis } from '../src/chain/config.ts';
import { GameClient, battleSalt, exploreSalt } from '../src/chain/client.ts';
import { toEngineState } from '../src/chain/state.ts';
import { loadAssets } from '../src/game/adventurer.ts';
import { applyAction, newGameState } from '../src/game/engine.ts';
import { ExactRandom, poseidon } from '../src/game/rng.ts';

function practiceClient(vrf = false): GameClient {
  const abis = practiceAbis();
  const provider = new RpcProvider({ nodeUrl: 'http://127.0.0.1:1' });
  return new GameClient(
    provider,
    { game: abis.game_systems.address, token: abis.game_token_systems.address },
    vrf ? { provider: '0x51fea4450da9d6aee758bdeba88b2f665bcbf549d2c61421aa724e9ac0ced8f', caller: abis.game_systems.address } : null,
    { game: abis.game_systems.abi as Abi, token: abis.game_token_systems.abi as Abi },
  );
}

const big = (xs: unknown[]) => xs.map((x) => BigInt(x as string));

test('action calldata matches the official client layout', () => {
  const c = practiceClient();
  const id = 42n;
  assert.deepEqual(big(c.actionCall(id, { type: 'start', weapon: 12 }).calldata as string[]), [42n, 12n]);
  assert.deepEqual(big(c.actionCall(id, { type: 'explore', tillBeast: true }).calldata as string[]), [42n, 1n]);
  assert.deepEqual(big(c.actionCall(id, { type: 'attack', toTheDeath: false }).calldata as string[]), [42n, 0n]);
  assert.deepEqual(big(c.actionCall(id, { type: 'flee', toTheDeath: true }).calldata as string[]), [42n, 1n]);
  assert.deepEqual(big(c.actionCall(id, { type: 'equip', items: [3, 77] }).calldata as string[]), [42n, 2n, 3n, 77n]);
  assert.deepEqual(big(c.actionCall(id, { type: 'drop', items: [5] }).calldata as string[]), [42n, 1n, 5n]);
  assert.deepEqual(
    big(c.actionCall(id, { type: 'buy', potions: 2, items: [{ itemId: 9, equip: true }, { itemId: 30, equip: false }] }).calldata as string[]),
    [42n, 2n, 2n, 9n, 1n, 30n, 0n],
  );
  assert.deepEqual(
    big(c.actionCall(id, { type: 'stats', stats: { str: 1, dex: 2, cha: 3 } }).calldata as string[]),
    [42n, 1n, 2n, 0n, 0n, 0n, 3n, 0n],
  );
  assert.equal(c.actionCall(id, { type: 'explore', tillBeast: false }).entrypoint, 'explore');
});

test('transactions: non-random actions ride with the next random action, VRF request first', () => {
  const c = practiceClient(true);
  const s = newGameState(7n);
  s.adventurer.xp = 30;
  s.adventurer.actionCount = 11;
  const txs = c.planTransactions(7n, [
    { type: 'stats', stats: { dex: 1 } },
    { type: 'buy', potions: 1, items: [] },
    { type: 'explore', tillBeast: false },
  ], s);
  assert.equal(txs.length, 1);
  assert.deepEqual(txs[0].calls.map((x) => x.entrypoint), ['request_random', 'select_stat_upgrades', 'buy_items', 'explore']);
  const vrf = big(txs[0].calls[0].calldata as string[]);
  assert.equal(vrf[1], 1n); // Source::Salt
  assert.equal(vrf[2], poseidon([30n, 7n]));
  assert.equal(exploreSalt(7n, 30), poseidon([30n, 7n]));

  s.adventurer.beastHealth = 10;
  const battle = c.planTransactions(7n, [{ type: 'attack', toTheDeath: false }], s);
  assert.equal(big(battle[0].calls[0].calldata as string[])[2], battleSalt(7n, 30, 11));
  assert.equal(battleSalt(7n, 30, 11), poseidon([30n, 7n, 12n]));

  // equip in battle consumes randomness (beast counterattack) -> needs VRF
  const eq = c.planTransactions(7n, [{ type: 'equip', items: [3] }], s);
  assert.equal(eq[0].calls[0].entrypoint, 'request_random');
  // out of battle a lone equip has no VRF
  s.adventurer.beastHealth = 0;
  const eq2 = c.planTransactions(7n, [{ type: 'equip', items: [3] }], s);
  assert.deepEqual(eq2[0].calls.map((x) => x.entrypoint), ['equip']);
});

test('chain state decoding round-trips engine state (boosted get_game_state -> stored stats)', () => {
  const rng = new ExactRandom();
  let s = newGameState(123n);
  s = applyAction(s, { type: 'start', weapon: 46 }, rng).state;
  s = applyAction(s, { type: 'attack', toTheDeath: true }, rng).state;
  const loaded = loadAssets(s.adventurer, s.bag);
  const item = (i: { id: number; xp: number }) => ({ id: BigInt(i.id), xp: BigInt(i.xp) });
  const eq = loaded.equipment;
  const parsed = {
    adventurer: {
      health: BigInt(loaded.health),
      xp: BigInt(loaded.xp),
      gold: BigInt(loaded.gold),
      beast_health: BigInt(loaded.beastHealth),
      stat_upgrades_available: BigInt(loaded.statUpgrades),
      stats: {
        strength: BigInt(loaded.stats.str),
        dexterity: BigInt(loaded.stats.dex),
        vitality: BigInt(loaded.stats.vit),
        intelligence: BigInt(loaded.stats.int),
        wisdom: BigInt(loaded.stats.wis),
        charisma: BigInt(loaded.stats.cha),
        luck: BigInt(loaded.stats.luck),
      },
      equipment: { weapon: item(eq[1]), chest: item(eq[2]), head: item(eq[3]), waist: item(eq[4]), foot: item(eq[5]), hand: item(eq[6]), neck: item(eq[7]), ring: item(eq[8]) },
      item_specials_seed: BigInt(loaded.itemSpecialsSeed),
      action_count: BigInt(loaded.actionCount),
    },
    bag: Object.fromEntries(s.bag.map((b, i) => [`item_${i + 1}`, item(b)])),
    beast: { id: 0n, seed: 0n, health: 0n, level: 0n, specials: { special1: 0n, special2: 0n, special3: 0n }, is_collectable: false },
    market: s.market.map(BigInt),
  };
  const d = toEngineState(123n, { gameState: parsed });
  assert.deepEqual(d.adventurer, { ...s.adventurer, stats: { ...s.adventurer.stats, luck: 0 } });
  assert.deepEqual(d.market, s.market);
  assert.equal(d.started, true);
});
