export type RoomStatus = 'lobby' | 'synthesizing' | 'swiping' | 'summary';
export type CloseReason = 'manual' | 'timeout';
export type CloseWindowId = '1h' | '1d';

export type Room = {
  id: string;
  topic: string;
  hostId: string;
  status: RoomStatus;
  entryLimit: number;
  round: number;
  parentRoomId?: string;
  parentCardId?: string;
  closesAt?: Date;
  votesCloseAt?: Date;
  closeWindow?: CloseWindowId;
  closedBy?: string;
  closeReason?: CloseReason;
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
};

export type CardKind = 'synthesized' | 'blindspot';

export type Card = {
  id: string;
  text: string;
  kind: CardKind;
  order: number;
  agreeCount: number;
  disagreeCount: number;
};

export type Vote = {
  id: string;
  uid: string;
  cardId: string;
  choice: 'agree' | 'disagree';
};

export type SynthesisCard = {
  text: string;
  kind: CardKind;
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
};
