import re, json, sys
root = sys.argv[1]
const = open(root + '/contracts/src/constants/loot.cairo').read()
utils = open(root + '/contracts/src/utils/loot.cairo').read()
items = json.load(open('items.json'))
obst = open(root + '/client/src/constants/obstacle.ts').read()
beast_ts = open(root + '/client/src/constants/beast.ts').read()

def mod(name):
    m = re.search(r'pub mod %s \{(.*?)\n\}' % name, const, re.S)
    return m.group(1)

idx = {n: int(v) for n, v in re.findall(r'pub const (\w+): u8 = (\d+);', mod('ItemIndex'))}
slotlen = {n: int(v) for n, v in re.findall(r'pub const (\w+): u8 = (\d+);', mod('ItemSlotLength'))}
prefix_names = re.findall(r"pub const \w+: felt252 = '([^']*)';", mod('ItemNamePrefixString'))
suffix_names = re.findall(r"pub const \w+: felt252 = '([^']*)';", mod('ItemNameSuffixString'))
item_suffix_names = re.findall(r"pub const \w+: felt252 = '([^']*)';", mod('ItemSuffixString'))
# verify order matches numeric ids
pre_ids = re.findall(r'pub const (\w+): u8 = (\d+);', mod('ItemNamePrefix'))
assert [int(v) for _, v in pre_ids] == list(range(1, 70)), 'prefix ids'
assert len(prefix_names) == 69 and len(suffix_names) == 18 and len(item_suffix_names) == 16

tier_num = {'None':0,'T1':1,'T2':2,'T3':3,'T4':4,'T5':5}
type_num = {'None':0,'Magic_or_Cloth':1,'Blade_or_Hide':2,'Bludgeon_or_Metal':3,'Necklace':4,'Ring':5}
slot_num = {'None':0,'Weapon':1,'Chest':2,'Head':3,'Waist':4,'Foot':5,'Hand':6,'Neck':7,'Ring':8}

rows = []
for it in items['items']:
    rows.append((it['id'], it['name'], tier_num[it['tier']], type_num[it['type']], slot_num[it['slot']], idx[it['key']], it['key']))
assert [r[0] for r in rows] == list(range(1, 102))

obst_names = [n for _, n in sorted(((int(k), v) for k, v in re.findall(r'(\d+): "([^"]+)"', obst)))]
assert len(obst_names) == 75
bm = re.search(r'BEAST_NAMES[^{]*\{(.*?)\n\};', beast_ts, re.S).group(1)
beast_names = [n for _, n in sorted(((int(k), v) for k, v in re.findall(r'(\d+): "([^"]+)"', bm)))]
assert len(beast_names) == 75

out = []
out.append('// Generated from Provable-Games/death-mountain contracts (constants/loot.cairo, utils/loot.cairo)')
out.append('// and client constants (beast/obstacle names). Regenerate with scripts/gen-data.py; do not edit by hand.')
out.append('')
out.append('/** [id, name, tier(1..5), type(1 magic/cloth, 2 blade/hide, 3 bludgeon/metal, 4 necklace, 5 ring), slot(1..8), index within slot] */')
out.append('export const ITEM_ROWS: ReadonlyArray<readonly [number, string, number, number, number, number]> = [')
for r in rows:
    out.append('  [%d, %s, %d, %d, %d, %d],' % (r[0], json.dumps(r[1]), r[2], r[3], r[4], r[5]))
out.append('];')
out.append('')
out.append('/** Item ids by key name, e.g. ITEM_ID.Katana === 42 */')
out.append('export const ITEM_ID = {')
for r in rows:
    out.append('  %s: %d,' % (r[6], r[0]))
out.append('} as const;')
out.append('')
for t in range(1, 6):
    lst = items['tiers'][str(t)]
    out.append('/** T%d items in contract order (loot discovery indexes into this list) */' % t)
    out.append('export const T%d_ITEMS: readonly number[] = [%s];' % (t, ', '.join(map(str, lst))))
out.append('')
order = ['SlotItemsLengthWeapon','SlotItemsLengthChest','SlotItemsLengthHead','SlotItemsLengthWaist','SlotItemsLengthFoot','SlotItemsLengthHand','SlotItemsLengthNeck','SlotItemsLengthRing']
out.append('/** Number of items per slot, indexed by slot id (0 = none) */')
out.append('export const SLOT_LENGTH: readonly number[] = [0, %s];' % ', '.join(str(slotlen[o]) for o in order))
out.append('')
out.append('export const NAME_PREFIXES: readonly string[] = [%s];' % ', '.join(json.dumps(x) for x in [''] + prefix_names))
out.append('export const NAME_SUFFIXES: readonly string[] = [%s];' % ', '.join(json.dumps(x) for x in [''] + suffix_names))
out.append('export const ITEM_SUFFIXES: readonly string[] = [%s];' % ', '.join(json.dumps(x) for x in [''] + item_suffix_names))
out.append('')
out.append('export const BEAST_NAMES: readonly string[] = [%s];' % ', '.join(json.dumps(x) for x in [''] + beast_names))
out.append('export const OBSTACLE_NAMES: readonly string[] = [%s];' % ', '.join(json.dumps(x) for x in [''] + obst_names))
open(sys.argv[2], 'w').write('\n'.join(out) + '\n')
print('ok', len(rows))
