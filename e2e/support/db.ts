import mongoose, { Types, type Connection } from "mongoose";

// The dev server (`next dev`, NODE_ENV=development) reads and writes the "dev"
// collection; see src/models/User.ts. Tests only ever touch the E2E user's
// document in it.
const COLLECTION = "dev";

export type SeedGameResults = {
  game1Result: boolean | null;
  game2Result: boolean | null;
  game3Result: boolean | null;
};

export type SeedRound = {
  roundNum: number;
  tableNum?: number;
  roundResult?: boolean;
  dieRollResult?: boolean;
  gameResults?: SeedGameResults;
  opponentsName?: string;
  opponentsDeck?: string;
  opponentsDeckSize?: number;
  roundNotes?: string;
};

export type SeedEvent = {
  eventName: string;
  eventDateTime: Date;
  eventFormat?: string;
  eventLocation?: string;
  playerCount?: number;
  isPremierEvent?: boolean;
  deck?: string;
  eventNotes?: string;
  roundLog?: SeedRound[];
};

export type StoredRound = SeedRound & { _id: Types.ObjectId };
export type StoredEvent = Required<Omit<SeedEvent, "roundLog">> & {
  _id: Types.ObjectId;
  roundLog: StoredRound[];
  lastUpdated: Date;
};

type StoredUser = { clerkId: string; email: string; name: string; eventLog: StoredEvent[] };

function toStoredEvent(e: SeedEvent): StoredEvent {
  return {
    _id: new Types.ObjectId(),
    eventFormat: "Advanced",
    eventLocation: "",
    playerCount: 0,
    isPremierEvent: false,
    deck: "",
    eventNotes: "",
    ...e,
    roundLog: (e.roundLog ?? []).map((r) => ({
      _id: new Types.ObjectId(),
      opponentsName: "",
      opponentsDeck: "",
      roundNotes: "",
      ...r,
    })),
    lastUpdated: new Date(),
  };
}

export class TestDb {
  private constructor(
    private readonly conn: Connection,
    readonly clerkId: string,
    readonly email: string,
  ) {}

  static async connect() {
    const uri = process.env.MONGODB_URI;
    const clerkId = process.env.E2E_CLERK_USER_ID;
    const email = process.env.E2E_CLERK_USER_EMAIL;
    if (!uri || !clerkId || !email) {
      throw new Error("MONGODB_URI / E2E_CLERK_USER_ID / E2E_CLERK_USER_EMAIL missing; did global setup run?");
    }
    const conn = await mongoose.createConnection(uri).asPromise();
    return new TestDb(conn, clerkId, email);
  }

  private get users() {
    return this.conn.collection<StoredUser>(COLLECTION);
  }

  // Replaces the E2E user's events with `events` (in creation order: the last
  // one is the app's "latest created event"). Returns them with their ids.
  async reset(events: SeedEvent[] = []) {
    const eventLog = events.map(toStoredEvent);
    await this.users.updateOne(
      { clerkId: this.clerkId },
      {
        $set: { eventLog, email: this.email, name: "E2E Tester" },
        $setOnInsert: { clerkId: this.clerkId },
      },
      { upsert: true },
    );
    return eventLog;
  }

  async events(): Promise<StoredEvent[]> {
    const user = await this.users.findOne({ clerkId: this.clerkId });
    return user?.eventLog ?? [];
  }

  async close() {
    await this.conn.close();
  }
}
