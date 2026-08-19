# 04 データモデル設計書

## 1. 文書情報

- バージョン：v0.2（シンプル版）
- 実装言語：TypeScript
- 目的：ゲームに必要な最小限の状態を定義する。

## 2. 原則

- ゲーム処理と画面表示を分離する。
- 状態は1つの`GameState`へまとめる。
- 表示名ではなく固定IDを計算に使う。
- 派生値は保存せず必要時に計算する。
- ゲーム処理で`Math.random()`を使わない。
- 保存データにバージョンを付ける。

## 3. 最小構成

```text
src/
  engine/       乱数、成長、成績、進行
  data/         球団、イベント、バランス値
  ui/           単一画面と結果画面
  storage/      セーブ、読み込み
```

細かいドメインごとの分割は、ファイルが大きくなってから行う。

## 4. 基本型

```ts
type Stage =
  | "CREATION"
  | "HIGH_SCHOOL"
  | "RETRY"
  | "PRO_JAPAN"
  | "PRO_OVERSEAS"
  | "RETIRED";

type Position = "P" | "C" | "IF" | "OF";
type Level = "BENCH" | "STARTER" | "DEVELOPMENT" | "FARM" | "FIRST_TEAM" | "MINOR" | "MAJOR";
type SeasonPart = "SPRING" | "SUMMER" | "AUTUMN" | "WINTER" | "CAMP" | "SEASON" | "OFFSEASON";
```

## 5. 選手

```ts
interface Player {
  name: string;
  age: number;
  position: Position;
  throws: "R" | "L";
  bats: "R" | "L";
  abilities: PitcherAbilities | BatterAbilities;
  abilityCaps: Record<string, number>;
  fatigue: number;
  condition: number;
  traits: TraitId[];
}

interface PitcherAbilities {
  kind: "PITCHER";
  stamina: number;
  velocity: number;
  control: number;
  breaking: number;
}

interface BatterAbilities {
  kind: "BATTER";
  stamina: number;
  contact: number;
  power: number;
  speed: number;
  defense: number;
}
```

全能力と疲労は0〜100へ制限する。各能力はSeedから決定した`abilityCaps`も超えない。調子は`-2〜+2`の5段階を基本とする（暫定）。

## 6. キャリア

```ts
interface Career {
  stage: Stage;
  level: Level;
  year: number;
  age: number;
  schoolYear?: 1 | 2 | 3;
  part: SeasonPart;
  teamId?: string;
  salary: number;       // 万円
  proYears: number;
  retiredReason?: string;
}
```

FA日数、契約年数、詳細な登録履歴は持たない。海外挑戦などの条件は年齢、プロ年数、実績からその場で計算する。

## 7. 年間成績

```ts
interface SeasonRecord {
  year: number;
  age: number;
  teamId?: string;
  level: Level;
  batting?: BattingStats;
  pitching?: PitchingStats;
  awards: string[];
  summary: string;
}

interface BattingStats {
  games: number;
  plateAppearances: number;
  atBats: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  runsBattedIn: number;
  walks: number;
  stolenBases: number;
  defenseRuns: number;
}

interface PitchingStats {
  games: number;
  inningsOuts: number;
  wins: number;
  losses: number;
  saves: number;
  holds: number;
  hitsAllowed: number;
  walks: number;
  strikeouts: number;
  earnedRuns: number;
}
```

AVG、OBP、SLG、OPS、ERA、WHIPは表示時に計算する。投球回は誤差を避けるためアウト数で保存する。

年度別、リーグ別通算、国際大会通算で表示する列と順序は[02-game-rules.md](./02-game-rules.md)に従う。

## 8. イベント

```ts
interface GameEvent {
  id: string;
  title: string;
  text: string;
  weight: number;
  once?: boolean;
  conditions: EventCondition[];
  choices: EventChoice[];
}

interface EventChoice {
  id: string;
  label: string;
  hint?: string;
  effects: EventEffect[];
}
```

条件例：ステージ、年齢、能力の最低値、疲労、所属レベル、特性、発生済みイベント。

効果例：能力増減、疲労増減、特性追加、所属変更、年俸補正、次ステージ移行。

任意のJavaScriptをイベントデータへ入れず、定義済み効果だけを使う。

## 9. 球団

```ts
interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  development: number;
  strength: number;
}
```

日本は架空12球団、海外は架空30球団とする。海外30球団は2リーグ各15球団に分ける。球団差は育成力と強さの2項目だけにし、細かな予算、医療、ポジション需要は初回版では持たない。

## 10. 履歴

```ts
interface HistoryEntry {
  turn: number;
  year: number;
  age: number;
  title: string;
  text: string;
  important: boolean;
}
```

画面表示を単純にするため、初回版では完成文章を保存する。多言語化が必要になった段階で文言キー方式を検討する。

## 11. ゲーム全体

```ts
interface GameState {
  schemaVersion: number;
  gameVersion: string;
  seed: string;
  rngState: number[];
  turn: number;
  status: "ACTIVE" | "COMPLETED";
  player: Player;
  career: Career;
  seasons: SeasonRecord[];
  history: HistoryEntry[];
  usedEventIds: string[];
  currentEvent?: GameEventView;
}
```

## 12. 操作

UIからゲームエンジンへ渡す操作は少数にする。

```ts
type GameAction =
  | { type: "START"; player: NewPlayerInput }
  | { type: "CHOOSE"; eventId: string; choiceId: string }
  | { type: "ALLOCATE_DIE"; dieIndex: number; ability: string }
  | { type: "RESTART" };
```

選択後のターン進行、成績生成、保存はエンジン側で自動処理する。

## 13. バランス設定

調整値は`balance.ts`へ集約する。

```ts
interface BalanceConfig {
  initialAbilities: Record<Position, number[]>;
  growthRates: Record<string, number>;
  injuryRate: number;
  draftThresholds: number[];
  firstTeamThreshold: number;
  overseasThreshold: number;
  retirement: { minAge: number; maxAge: number };
}
```

## 14. 保存

- `localStorage`に1つの進行データを保存する。
- 1つ前の正常保存をバックアップする。
- 選択確定後に自動保存する。
- 名前、Seed、ゲーム状態以外の個人情報は保存しない。
- 初回版では複数セーブ、クラウド保存、インポートを実装しない。

## 15. データ検証

- イベントIDと球団IDの重複禁止
- 条件と効果の種類を検証
- 能力、確率、重みの範囲を検証
- 参照先イベント・球団の存在確認
- 読み込み時に保存バージョンを確認

## 16. 暫定値

- 調子の5段階
- 球団数
- RNGアルゴリズム
- バックアップ数
- イベント定義の条件・効果一覧

## 17. 継続検討事項

- 年間成績の詳細項目を増やすか
- 複数セーブを将来追加するか
