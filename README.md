# 🍻 Kawalerski Matiego — kawalerski-matiego.pl

Strona turniejowa na kawalerski: bilard 🎱, dart 🎯, ping-pong 🏓.
Setup graczy → losowanie grup → faza grupowa (każdy z każdym) → playoff
(półfinały, mecz o 3. miejsce, finał) → klasyfikacja generalna wyłaniająca
**Mistrza Kawalerskiego** 👑.

Stan jest współdzielony — każdy patrzy w drabinkę na swoim telefonie, wyniki
wpisuje ktokolwiek. Bez logowania; PIN chroni tylko reset turnieju.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Cloudflare Workers przez [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)
- Cloudflare D1 (SQLite) — stan turnieju
- SWR z pollingiem co 4 s — „live" bez websocketów

## Development

```bash
npm install
npx wrangler d1 migrations apply kawalerski --local
npm run dev
```

Testy logiki turnieju: `npm test`. PIN resetu w dev: `ADMIN_PIN` w `.dev.vars`.

## Deploy (jednorazowy setup)

1. `npx wrangler login`
2. `npx wrangler d1 create kawalerski` → wklej zwrócone `database_id` do
   `wrangler.jsonc` (pole `d1_databases[0].database_id`)
3. `npx wrangler d1 migrations apply kawalerski --remote`
4. `npx wrangler secret put ADMIN_PIN`
5. `npm run deploy` → apka żyje na `kawalerski-matiego.<account>.workers.dev`

### Domena kawalerski-matiego.pl

1. Kup domenę u rejestratora (Cloudflare Registrar nie obsługuje `.pl`)
2. W Cloudflare: **Add site** (plan Free) i przestaw nameservery u rejestratora
3. Workers & Pages → `kawalerski-matiego` → Settings → **Domains & Routes** →
   dodaj `kawalerski-matiego.pl`

Kolejne wdrożenia: samo `npm run deploy`.
