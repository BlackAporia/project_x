// Free practice dungeon ("Practice for Free" on lootsurvivor.io): a Cartridge Katana slot without fees or VRF.
// The bot uses a throw-away burner account exactly like the official client (same account class, self-funded deploy).
// The burner key protects nothing of value; it is still kept out of git (.session/ is ignored).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Account, CallData, ec, hash, stark, type Abi, type Call, type RpcProvider } from 'starknet';
import { PRACTICE, practiceAbis } from './config.ts';
import { GameClient, type Executor } from './client.ts';
import { connectProvider, retry } from './rpc.ts';

const BURNER_FILE = process.env.PRACTICE_BURNER_FILE ?? '.session/practice-burner.json';

interface BurnerData {
  address: string;
  privateKey: string;
  rpc: string;
}

export class BurnerExecutor implements Executor {
  readonly address: string;
  private account: Account;

  constructor(account: Account) {
    this.account = account;
    this.address = account.address;
  }

  async execute(calls: Call[]): Promise<{ transaction_hash: string }> {
    // Katana slot: fees are not charged, skip estimation round-trips
    return retry(() => this.account.execute(calls), { label: 'practice execute', tries: 3, baseMs: 500 });
  }
}

async function deployBurner(provider: RpcProvider, rpc: string): Promise<BurnerData> {
  const privateKey = stark.randomAddress();
  const publicKey = ec.starkCurve.getStarkKey(privateKey);
  const constructorCalldata = CallData.compile({ publicKey });
  const address = hash.calculateContractAddressFromHash(publicKey, PRACTICE.burnerClassHash, constructorCalldata, 0);
  const account = new Account({ provider, address, signer: privateKey });
  const { transaction_hash } = await account.deployAccount({ classHash: PRACTICE.burnerClassHash, constructorCalldata, addressSalt: publicKey });
  await provider.waitForTransaction(transaction_hash, { retryInterval: 200 });
  const data = { address, privateKey, rpc };
  mkdirSync(dirname(BURNER_FILE), { recursive: true });
  writeFileSync(BURNER_FILE, JSON.stringify(data), { mode: 0o600 });
  return data;
}

export interface PracticeSession {
  client: GameClient;
  executor: BurnerExecutor;
  provider: RpcProvider;
  rpc: string;
}

export async function openPractice(): Promise<PracticeSession> {
  const { provider, url } = await connectProvider(PRACTICE.rpcUrls);
  let burner: BurnerData | null = null;
  if (existsSync(BURNER_FILE)) {
    try {
      const b = JSON.parse(readFileSync(BURNER_FILE, 'utf8')) as BurnerData;
      // the slot may have been reset: make sure the account still exists
      await provider.getClassHashAt(b.address);
      burner = b;
    } catch {
      burner = null;
    }
  }
  if (!burner) {
    burner = await deployBurner(provider, url);
    console.log(`[practice] deployed burner ${burner.address}`);
  }
  const account = new Account({ provider, address: burner.address, signer: burner.privateKey });
  const abis = practiceAbis();
  const pick = (k: string) => abis[k]?.abi as Abi | undefined;
  const client = new GameClient(
    provider,
    {
      game: PRACTICE.gameSystems,
      token: PRACTICE.gameTokenSystems,
      settings: PRACTICE.settingsSystems,
      adventurer: PRACTICE.adventurerSystems,
    },
    null,
    { game: pick('game_systems'), token: pick('game_token_systems'), settings: pick('settings_systems'), adventurer: pick('adventurer_systems') },
  );
  await client.init();
  return { client, executor: new BurnerExecutor(account), provider, rpc: url };
}
