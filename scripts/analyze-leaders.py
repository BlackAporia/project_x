"""Summarise how the top leaderboard players play (event histories downloaded by `npm run bot -- leaders`).
Usage: python3 scripts/analyze-leaders.py <leaders dir>"""
import json, os, sys, statistics as st
from collections import Counter, defaultdict

WEAPONS = set(range(9, 17)) | set(range(42, 47)) | set(range(72, 77))
JEWELRY = set(range(1, 9))
def tier(i):
    if i <= 0: return 0
    if i <= 3: return 1
    if i == 4: return 2
    if i == 5: return 3
    if i <= 8: return 1
    k = [9,13,17,22,27,32,37,42,47,52,57,62,67,72,77,82,87,92,97]
    for base in k:
        if base <= i < base + 5 or (base in (9,13) and base <= i < base + 4):
            return (i - base) + 1 if (i - base) < 5 else 5
    return 5
def lvl(xp): return 1 if xp == 0 else int(xp ** 0.5)

rows = []
for f in sorted(os.listdir(sys.argv[1])):
    d = json.load(open(os.path.join(sys.argv[1], f)))
    if not d.get('events'): continue
    ev = sorted(d['events']['events'], key=lambda e: (e['block_number'], e['event_index']))
    snaps = {}
    adv = None
    in_battle = False
    eq_battle = eq_out = weapon_swaps = 0
    buys = Counter(); potions = 0; items_bought = 0
    flee = kill = 0
    stat_order = []
    bag_max = 0
    first_bag_g20 = None
    for e in ev:
        t = e['type']
        if t == 'adventurer_events':
            adv = e
            in_battle = e['beast_health'] > 0
            L = lvl(e['xp'])
            snaps[L] = e
        elif t == 'equip_events':
            if in_battle: eq_battle += 1
            else: eq_out += 1
            if any(i in WEAPONS for i in e['items']): weapon_swaps += 1
        elif t == 'buy_items_events':
            potions += e['potions']; items_bought += len(e['items_purchased'])
        elif t == 'fled_beast_events': flee += 1
        elif t == 'defeated_beast_events': kill += 1
        elif t == 'stat_upgrade_events' and adv:
            for k in ('strength','dexterity','vitality','intelligence','wisdom','charisma'):
                if e[k]: stat_order.append((lvl(adv['xp']), k[:3], e[k]))
        elif t == 'bag_events':
            n = sum(1 for i in e['items'] if i['id'])
            bag_max = max(bag_max, n)
            if first_bag_g20 is None and adv and any(i['xp'] >= 400 for i in e['items'] if i['id']):
                first_bag_g20 = lvl(adv['xp'])
    final = d['adventurer']['adventurer'] if isinstance(d['adventurer'], dict) and 'adventurer' in d['adventurer'] else adv
    rows.append(dict(xp=final['xp'], L=lvl(final['xp']), snaps=snaps, eq_battle=eq_battle, eq_out=eq_out, weapon_swaps=weapon_swaps,
                     potions=potions, items_bought=items_bought, flee=flee, kill=kill, stat_order=stat_order, bag_max=bag_max,
                     first_bag_g20=first_bag_g20, final=final))

print(f"{len(rows)} leader games, xp {min(r['xp'] for r in rows)}..{max(r['xp'] for r in rows)}")
keys = ['strength','dexterity','vitality','intelligence','wisdom','charisma','luck']
for L in (5, 10, 15, 20, 25, 30, 35, 40, 45):
    vals = defaultdict(list); hp = []; gold = []; g = []
    for r in rows:
        s = r['snaps'].get(L)
        if not s: continue
        for k in keys: vals[k].append(s[k])
        hp.append(100 + 15 * s['vitality']); gold.append(s['gold'])
        g.append(st.mean([min(20, int((it['xp'] or 0) ** 0.5) if it['xp'] else 1) for it in s['equipment'].values() if it['id']] or [0]))
    if not hp: continue
    print(f"L{L:2d} n={len(hp):2d} " + ' '.join(f"{k[:3]}={st.mean(vals[k]):5.1f}" for k in keys) + f" maxHP~{st.mean(hp):.0f} gold={st.mean(gold):.0f} avgG={st.mean(g):.1f}")
print('per game: equips in battle %.1f, outside %.1f, weapon swaps %.1f, items bought %.1f, potions %.0f, kills %.0f, flees %.0f, max bag %.1f, first G20 in bag at L%s' % (
    st.mean(r['eq_battle'] for r in rows), st.mean(r['eq_out'] for r in rows), st.mean(r['weapon_swaps'] for r in rows),
    st.mean(r['items_bought'] for r in rows), st.mean(r['potions'] for r in rows), st.mean(r['kill'] for r in rows),
    st.mean(r['flee'] for r in rows), st.mean(r['bag_max'] for r in rows), st.median([r['first_bag_g20'] or 99 for r in rows])))
# first stat points: what do they buy in the first levels
first = Counter()
for r in rows:
    for (L, k, n) in r['stat_order']:
        if L <= 10: first[k] += n
print('stat points spent by level 10:', dict(first))
late = Counter()
for r in rows:
    for (L, k, n) in r['stat_order']:
        if L > 25: late[k] += n
print('stat points spent after level 25:', dict(late))
fin = rows[0]['final']
print('example final gear:', {k: v for k, v in fin['equipment'].items()})
