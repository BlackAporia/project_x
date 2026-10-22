// Numeric rules of Death Mountain / Loot Survivor, mirrored from the Cairo sources
// (contracts/src/constants/*.cairo). Names follow the Cairo constants.

export const SLOT = { None: 0, Weapon: 1, Chest: 2, Head: 3, Waist: 4, Foot: 5, Hand: 6, Neck: 7, Ring: 8 } as const;
export const SLOT_NAMES = ['None', 'Weapon', 'Chest', 'Head', 'Waist', 'Foot', 'Hand', 'Neck', 'Ring'] as const;
/** Slots a beast or obstacle can hit (get_attack_location: seed % 5). */
export const ARMOR_SLOTS = [SLOT.Chest, SLOT.Head, SLOT.Waist, SLOT.Foot, SLOT.Hand] as const;

/** Item / beast type. For weapons and beast attacks: Magic, Blade, Bludgeon. For armor: Cloth, Hide, Metal. */
export const TYPE = { None: 0, MagicCloth: 1, BladeHide: 2, BludgeonMetal: 3, Necklace: 4, Ring: 5 } as const;
export const TYPE_NAMES = ['None', 'Magic/Cloth', 'Blade/Hide', 'Bludgeon/Metal', 'Necklace', 'Ring'] as const;
export const WEAPON_TYPE_NAMES = ['None', 'Magic', 'Blade', 'Bludgeon', 'Necklace', 'Ring'] as const;
export const ARMOR_TYPE_NAMES = ['None', 'Cloth', 'Hide', 'Metal', 'Necklace', 'Ring'] as const;

export const STARTING_GOLD = 40;
export const STARTING_HEALTH = 100;
export const MAX_ADVENTURER_HEALTH = 1023;
export const MAX_ADVENTURER_XP = 32767;
export const MAX_GOLD = 511;
export const MAX_STAT_UPGRADES_AVAILABLE = 15;
export const ITEM_MAX_XP = 400;
export const ITEM_MAX_GREATNESS = 20;
export const SUFFIX_UNLOCK_GREATNESS = 15;
export const PREFIXES_UNLOCK_GREATNESS = 19;
export const MAX_GREATNESS_STAT_BONUS = 1;

export const BASE_POTION_PRICE = 1;
export const POTION_HEALTH_AMOUNT = 10;
export const MINIMUM_POTION_PRICE = 1;
export const CHARISMA_POTION_DISCOUNT = 2;
export const CHARISMA_ITEM_DISCOUNT = 1;
export const MINIMUM_ITEM_PRICE = 1;
export const TIER_PRICE = 4;

export const SILVER_RING_LUCK_BONUS_PER_GREATNESS = 1;
export const JEWELRY_BONUS_BEAST_GOLD_PERCENT = 3;
export const JEWELRY_BONUS_CRITICAL_HIT_PERCENT_PER_GREATNESS = 3;
export const JEWELRY_BONUS_NAME_MATCH_PERCENT_PER_GREATNESS = 3;
export const NECKLACE_ARMOR_BONUS = 3;

export const HEALTH_INCREASE_PER_VITALITY = 15;
export const VITALITY_INSTANT_HEALTH_BONUS = 15;

export const MINIMUM_DAMAGE_TO_BEASTS = 4;
export const MINIMUM_DAMAGE_FROM_BEASTS = 2;
export const MINIMUM_DAMAGE_FROM_OBSTACLES = 4;
export const CRITICAL_HIT_LEVEL_MULTIPLIER = 1;

export const XP_FOR_DISCOVERIES = 1;
export const ITEM_XP_MULTIPLIER_BEASTS = 2;
export const ITEM_XP_MULTIPLIER_OBSTACLES = 1;
export const STARTER_BEAST_ATTACK_DAMAGE = 10;

// combat.cairo CombatSettings
export const ELEMENTAL_DAMAGE_BONUS = 2;
export const STRENGTH_DAMAGE_BONUS = 10;
export const XP_REWARD_DIVISOR = 2;
export const MAX_XP_DECAY = 95;
export const SPECIAL2_DAMAGE_MULTIPLIER = 8;
export const SPECIAL3_DAMAGE_MULTIPLIER = 2;

// beast.cairo BeastSettings
export const STARTER_BEAST_HEALTH = 3;
export const BEAST_MAXIMUM_HEALTH = 1023;
export const BEAST_MINIMUM_XP_REWARD = 4;
export const BEAST_CRITICAL_HIT_LEVEL_MULTIPLIER = 1;
export const BEAST_CRITICAL_HIT_AMBUSH_MULTIPLIER = 1;
export const BEAST_SPECIAL_NAME_LEVEL_UNLOCK = 19;
export const GOLD_REWARD_DIVISOR = 2;
export const MAX_SPECIAL2 = 69;
export const MAX_SPECIAL3 = 18;
export const MAX_BEAST_ID = 75;

export const OBSTACLE_MINIMUM_XP_REWARD = 4;
export const MAX_OBSTACLE_ID = 75;

export const NUM_ITEMS = 101;
export const BAG_SIZE = 15;
export const NAME_PREFIX_LENGTH = 69;
export const NAME_SUFFIX_LENGTH = 18;
export const ITEM_SUFFIX_LENGTH = 16;

/** Starting weapons accepted by start_game (loot_systems.is_starting_weapon). */
export const STARTER_WEAPONS = [12, 16, 46, 76] as const; // Wand, Book, Short Sword, Club

/** Default dungeon settings (settings_systems dojo_init, settings_id 0). */
export const DEFAULT_SETTINGS = {
  statsMode: 'Dodge' as 'Dodge' | 'Reduction',
  baseDamageReduction: 25,
  marketSize: 25,
  inBattle: false,
  gameSeed: 0n,
  gameSeedUntilXp: 0,
};

export const WANTED_BEASTS: ReadonlyArray<{ id: number; prefix: number; suffix: number; name: string }> = [
  { id: 29, prefix: 18, suffix: 6, name: '"Demon Grasp" Dragon' },
  { id: 53, prefix: 61, suffix: 1, name: '"Torment Bane" Balrog' },
  { id: 1, prefix: 47, suffix: 11, name: '"Pain Whisper" Warlock' },
];

export const STAT_KEYS = ['str', 'dex', 'vit', 'int', 'wis', 'cha'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
