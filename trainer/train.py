"""Value-network trainer (runs on the GPU when available).

Input: self-play dataset written by `npm run dataset` (one JSON object per line: f = feature vector,
remaining = XP the game scored after that state). Output: policy/value-net.json, an MLP the TypeScript
policy evaluates for continuation values (src/ai/valuenet.ts). Adoption is decided by simulation
(`npm run bot -- local`), never by the loss alone.
"""
import argparse
import json
import math
import random
import time
from pathlib import Path

import numpy as np
import torch
from torch import nn

FEATURES = [
    "level", "hp_frac", "max_hp", "gold", "str", "dex", "vit", "int", "wis", "cha", "luck",
    "weapon_tier_power", "weapon_greatness", "armor_slots", "armor_power", "armor_greatness", "jewelry", "bag_items",
]


def load(path: Path, limit: int):
    xs, ys, games = [], [], []
    game = 0
    last_final = None
    with path.open() as fh:
        for i, line in enumerate(fh):
            if limit and i >= limit:
                break
            row = json.loads(line)
            if len(row["f"]) != len(FEATURES):
                raise SystemExit(f"dataset has {len(row['f'])} features, expected {len(FEATURES)}: re-export with `npm run dataset`")
            # consecutive rows of one game share `final`; a new final value or a level drop marks a new game
            if last_final is not None and (row["final"] != last_final or (xs and row["f"][0] < xs[-1][0])):
                game += 1
            last_final = row["final"]
            xs.append(row["f"])
            ys.append(row["remaining"])
            games.append(game)
    return np.asarray(xs, np.float32), np.asarray(ys, np.float32), np.asarray(games)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/datasets/selfplay.jsonl")
    ap.add_argument("--out", default="policy/value-net.json")
    ap.add_argument("--epochs", type=int, default=40)
    ap.add_argument("--hidden", type=int, default=64)
    ap.add_argument("--batch", type=int, default=4096)
    ap.add_argument("--lr", type=float, default=2e-3)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--device", default="auto")
    ap.add_argument("--seed", type=int, default=1)
    args = ap.parse_args()

    torch.manual_seed(args.seed)
    random.seed(args.seed)
    dev = torch.device("cuda" if (args.device == "auto" and torch.cuda.is_available()) else (args.device if args.device != "auto" else "cpu"))
    print(f"device: {dev}" + (f" ({torch.cuda.get_device_name(0)})" if dev.type == "cuda" else ""))

    x, y, g = load(Path(args.data), args.limit)
    n_games = int(g.max()) + 1
    val_games = set(random.sample(range(n_games), max(1, n_games // 10)))
    val = np.array([gg in val_games for gg in g])
    print(f"{len(x)} rows from ~{n_games} games ({val.sum()} validation rows)")

    mean = x[~val].mean(0)
    std = x[~val].std(0) + 1e-6
    y_mean, y_std = float(y[~val].mean()), float(y[~val].std() + 1e-6)

    def tens(a):
        return torch.tensor(a, device=dev)

    xt, yt = tens((x[~val] - mean) / std), tens((y[~val] - y_mean) / y_std)
    xv, yv = tens((x[val] - mean) / std), tens(y[val])

    # baseline: the per-level table the policy uses without the network
    levels = x[:, 0].astype(int)
    table = {}
    for lv in np.unique(levels[~val]):
        table[lv] = float(y[~val][levels[~val] == lv].mean())
    base_pred = np.array([table.get(lv, y_mean) for lv in levels[val]], np.float32)
    base_rmse = math.sqrt(float(((base_pred - y[val]) ** 2).mean()))

    d = len(FEATURES)
    h = args.hidden
    model = nn.Sequential(nn.Linear(d, h), nn.ReLU(), nn.Linear(h, h), nn.ReLU(), nn.Linear(h, 1)).to(dev)
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=args.epochs)
    loss_fn = nn.HuberLoss(delta=1.0)
    best = (float("inf"), None)
    t0 = time.time()
    for ep in range(args.epochs):
        model.train()
        perm = torch.randperm(len(xt), device=dev)
        for i in range(0, len(xt), args.batch):
            idx = perm[i : i + args.batch]
            opt.zero_grad()
            loss = loss_fn(model(xt[idx]).squeeze(1), yt[idx])
            loss.backward()
            opt.step()
        sched.step()
        model.eval()
        with torch.no_grad():
            pv = model(xv).squeeze(1) * y_std + y_mean
            rmse = float(torch.sqrt(((pv - yv) ** 2).mean()))
        if rmse < best[0]:
            best = (rmse, {k: v.detach().cpu().clone() for k, v in model.state_dict().items()})
        if ep % 5 == 0 or ep == args.epochs - 1:
            print(f"epoch {ep + 1:3d}: val RMSE {rmse:8.2f}  (per-level table {base_rmse:8.2f})")
    model.load_state_dict(best[1])

    layers = []
    for m in model:
        if isinstance(m, nn.Linear):
            layers.append({"W": m.weight.detach().cpu().numpy().round(6).tolist(), "b": m.bias.detach().cpu().numpy().round(6).tolist()})
    out = {
        "features": FEATURES,
        "mean": mean.round(6).tolist(),
        "std": std.round(6).tolist(),
        "layers": layers,
        "outMean": y_mean,
        "outStd": y_std,
        "meta": {
            "rows": int(len(x)),
            "valRmse": round(best[0], 3),
            "tableRmse": round(base_rmse, 3),
            "device": str(dev),
            "seconds": round(time.time() - t0, 1),
            "trained": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    }
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(out))
    print(f"saved {args.out}: val RMSE {best[0]:.2f} vs table {base_rmse:.2f}")


if __name__ == "__main__":
    main()
