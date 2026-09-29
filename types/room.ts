export type RoomStatus = 'lobby' | 'synthesizing' | 'swiping' | 'summary';
export type CloseReason = 'manual' | 'timeout';
export type CloseWindowId = '30m' | '1h' | '24h' | '3d' | '7d';
export type RoomKind = 'group' | 'topic' | 'subtopic';
export type TopicMode = 'debate' | 'hot-takes' | 'bracket' | 'predictions';

export type Room = {
  id: string;
  topic: string;
  hostId: string;
  status: RoomStatus;
  entryLimit: number;
  round: number;
  name?: string;
  kind?: RoomKind;
  containerId?: string;
  mode?: TopicMode;
  parentRoomId?: string;
  parentCardId?: string;
  closesAt?: Date;
  votesCloseAt?: Date;
  closeWindow?: CloseWindowId;
  closedBy?: string;
  closeReason?: CloseReason;
  createdAt?: Date;
};

export type Participant = {
  id: string;
  displayName: string;
  avatarId: string;
  entryCount: number;
  finishedSwiping: boolean;
};

export type Entry = {
  id: string;
  authorId: string;
  text: string;
  seatId?: string;
};

export type CardKind = 'synthesized' | 'blindspot';

export type Card = {
  id: string;
  text: string;
  kind: CardKind;
  order: number;
  agreeCount: number;
  disagreeCount: number;
  createdAt?: Date | null;
  sourceEntryIds?: string[];
  sourceCount?: number;
};

export type Vote = {
  id: string;
  uid: string;
  cardId: string;
  choice: 'agree' | 'disagree';
  seatId?: string;
};

export type Seat = {
  id: string;
  displayName: string;
  avatarId: string;
  claimerUids: string[];
};

export type SynthesisCard = {
  text: string;
  kind: CardKind;
  sourceEntryIds?: string[];
  sourceCount?: number;
};

export type Agreement = {
  id: string;
  text: string;
  sourceRoomId: string;
  sourceCardId: string;
  parentCardId?: string;
  round: number;
};

export type RoomPreview = {
  code: string;
  topic: string;
  people: number;
  agreed: number;
  total: number;
  status: RoomStatus;
  date: Date | null;
  parentRoomId?: string;
  containerId?: string;
  kind?: RoomKind;
};

export type TopicPreview = {
  code: string;
  prompt: string;
  date: Date | null;
  status: RoomStatus;
  people: number;
  cardCount: number;
  subtopicCount: number;
  verdict: string;
  parentRoomId?: string;
  subtopics: TopicPreview[];
};

export type SavedRoom = {
  code: string;
  name: string;
  created: Date | null;
  hostId: string;
  memberCount: number;
  topicsDebated: number;
  verdictsReached: number;
  weekStreak: number;
  liveTopic?: TopicPreview;
  pastTopics: TopicPreview[];
  /** True when this row is a local placeholder waiting on a real Firestore load. */
  pending?: boolean;
};
