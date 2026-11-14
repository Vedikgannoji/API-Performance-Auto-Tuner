"""Create a new demo dataset without overwriting an existing database."""
import argparse
from pathlib import Path
from benchmark import seed


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--db', type=Path, default=Path('autotuner.sqlite3'))
    parser.add_argument('--orders', type=int, default=50000)
    args = parser.parse_args()
    if args.db.exists():
        parser.error('Database already exists; choose a new --db path')
    if args.orders < 1:
        parser.error('--orders must be positive')
    seed(args.db, args.orders)
    print(f'Created {args.db}: 1 user, 100 products, {args.orders} orders')
