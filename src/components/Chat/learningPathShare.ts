import type {
  DirectMessageDto,
  LearningPathShareCardData,
  PendingLearningPathShareSummaryDto,
  ShareStatus,
} from "../../types/chat";

const asString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value;
  return null;
};

const getMessageContentValue = (
  message: DirectMessageDto | Record<string, any>,
): string | null =>
  asString(message?.content) ?? asString((message as any)?.Content);

export const normalizeShareId = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase();

export const extractSharedLearningPathTitle = (
  content: string | null | undefined,
): string | null => {
  const raw = asString(content);
  if (!raw) return null;

  const patterns = [
    /^shared learning path:\s*(.+)$/i,
    /^share learning path:\s*(.+)$/i,
    /^learning path shared:\s*(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  return null;
};

export const getMessageTypeValue = (
  message: DirectMessageDto | Record<string, any>,
): string | null =>
  asString(message?.messageType) ?? asString((message as any)?.MessageType);

export const getLearningPathShareId = (
  message: DirectMessageDto | Record<string, any>,
): string | null =>
  asString(message?.learningPathShareId) ??
  asString((message as any)?.LearningPathShareId) ??
  asString((message as any)?.learningPathShare?.shareId) ??
  asString((message as any)?.learningPathShare?.ShareId) ??
  asString((message as any)?.LearningPathShare?.shareId) ??
  asString((message as any)?.LearningPathShare?.ShareId);

export const isLearningPathShareMessage = (
  message: DirectMessageDto | Record<string, any>,
): boolean => {
  const messageType = getMessageTypeValue(message);
  const shareId = getLearningPathShareId(message);
  if (messageType === "LearningPathShare" && shareId) return true;

  const content =
    asString(message?.content) ?? asString((message as any)?.Content);
  if (content) {
    const patterns = [
      /^shared learning path:\s*.+$/i,
      /^share learning path:\s*.+$/i,
      /^learning path shared:\s*.+$/i,
    ];
    if (patterns.some((p) => p.test(content))) return true;
  }

  return false;
};

export function buildLearningPathShareCardData(
  message: DirectMessageDto,
  pendingShares: PendingLearningPathShareSummaryDto[] = [],
): LearningPathShareCardData | null {
  const nested =
    (message as any)?.learningPathShare ??
    (message as any)?.LearningPathShare ??
    {};

  let shareId = getLearningPathShareId(message);
  const contentTitle = extractSharedLearningPathTitle(
    getMessageContentValue(message),
  );

  if (!shareId && contentTitle) {
    const normalizedTitle = contentTitle.trim().toLowerCase();
    const matchingPending = pendingShares.find(
      (s) => s.learningPathTitle.trim().toLowerCase() === normalizedTitle,
    );
    if (matchingPending) {
      shareId = matchingPending.shareId;
    }
  }

  if (!shareId && contentTitle) {
    shareId = message.messageId || `share-${Date.now()}`;
  }

  if (!shareId) return null;

  const normalizedShareId = normalizeShareId(shareId);
  const pendingShare = pendingShares.find(
    (share) => normalizeShareId(share.shareId) === normalizedShareId,
  );

  const title =
    asString(message.learningPathTitle) ??
    asString((message as any)?.LearningPathTitle) ??
    asString(nested?.learningPathTitle) ??
    asString(nested?.LearningPathTitle) ??
    asString(nested?.title) ??
    asString(nested?.Title) ??
    contentTitle ??
    asString(pendingShare?.learningPathTitle);

  if (!title) return null;

  const status = (asString(message.shareStatus) ??
    asString((message as any)?.ShareStatus) ??
    asString(nested?.status) ??
    asString(pendingShare?.status) ??
    "Pending") as ShareStatus;

  return {
    shareId,
    pathId:
      asString(message.pathId) ??
      asString((message as any)?.PathId) ??
      asString(nested?.pathId) ??
      asString(nested?.PathId) ??
      asString(pendingShare?.pathId),
    title,
    description:
      asString(message.learningPathDescription) ??
      asString((message as any)?.LearningPathDescription) ??
      asString(nested?.learningPathDescription) ??
      asString(nested?.LearningPathDescription) ??
      asString(nested?.description) ??
      asString(nested?.Description) ??
      pendingShare?.learningPathDescription ??
      null,
    mentorName:
      asString(message.mentorName) ??
      asString((message as any)?.MentorName) ??
      asString(nested?.mentorName) ??
      asString(nested?.MentorName) ??
      asString(pendingShare?.mentorName),
    studentName:
      asString(message.studentName) ??
      asString((message as any)?.StudentName) ??
      asString(nested?.studentName) ??
      asString(nested?.StudentName),
    status,
    sentAt:
      asString(message.sentAt) ??
      asString((message as any)?.SentAt) ??
      asString(nested?.sentAt) ??
      asString(nested?.SentAt) ??
      asString(pendingShare?.sentAt),
    respondedAt:
      asString(message.respondedAt) ??
      asString((message as any)?.RespondedAt) ??
      asString(nested?.respondedAt) ??
      asString(nested?.RespondedAt),
  };
}
