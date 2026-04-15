import { useEffect, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import useAuthStore from "../store/useAuthStore";
import useChatStore from "../store/useChatStore";
import type {
  DirectConversationDto,
  DirectMessageDto,
  NewMessageNotificationPayload,
} from "../types/chat";
import { getUnreadCount } from "../services/DirectChatService";

const rawBase =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.VITE_BASE_URL as string) ||
  (import.meta.env.PROD ? "https://pplp.click/api" : "");
const trimmed = (rawBase || "").replace(/\/+$/, "");
const isDev = typeof window !== "undefined" && import.meta.env.DEV;
const HUB_BASE = isDev
  ? ""
  : trimmed
    ? trimmed.endsWith("/api")
      ? trimmed.slice(0, -4)
      : trimmed
    : "";

const DIRECT_CHAT_HUB_URL = `${HUB_BASE}/hubs/direct-chat`;

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
};

const pickDirectPayloadObject = (payload: any): Record<string, any> | null => {
  const nested =
    payload?.message ??
    payload?.conversation ??
    payload?.data?.message ??
    payload?.data?.conversation ??
    payload?.result?.message ??
    payload?.result?.conversation ??
    payload?.data ??
    payload?.result ??
    payload;

  return nested && typeof nested === "object" ? nested : null;
};

const normalizeDirectLearningPathShare = (payload: any) => {
  if (!payload || typeof payload !== "object") return undefined;

  return {
    ...payload,
    shareId:
      asString(payload.shareId) ?? asString(payload.ShareId) ?? undefined,
    pathId: asString(payload.pathId) ?? asString(payload.PathId) ?? undefined,
    mentorId:
      asString(payload.mentorId) ?? asString(payload.MentorId) ?? undefined,
    studentId:
      asString(payload.studentId) ?? asString(payload.StudentId) ?? undefined,
    status: asString(payload.status) ?? asString(payload.Status) ?? undefined,
    sentAt: asString(payload.sentAt) ?? asString(payload.SentAt) ?? undefined,
    respondedAt:
      asString(payload.respondedAt) ?? asString(payload.RespondedAt) ?? null,
    learningPathTitle:
      asString(payload.learningPathTitle) ??
      asString(payload.LearningPathTitle) ??
      asString(payload.title) ??
      asString(payload.Title) ??
      undefined,
    learningPathDescription:
      asString(payload.learningPathDescription) ??
      asString(payload.LearningPathDescription) ??
      asString(payload.description) ??
      asString(payload.Description) ??
      null,
    mentorName:
      asString(payload.mentorName) ?? asString(payload.MentorName) ?? undefined,
    studentName:
      asString(payload.studentName) ??
      asString(payload.StudentName) ??
      undefined,
  };
};

const normalizeDirectConversation = (
  payload: any,
): DirectConversationDto | null => {
  const nested = pickDirectPayloadObject(payload);
  if (!nested) return null;

  const conversationId =
    asString(nested.conversationId) ?? asString(nested.ConversationId);
  if (!conversationId) return null;

  return {
    ...nested,
    conversationId,
    mentorId: asString(nested.mentorId) ?? asString(nested.MentorId) ?? "",
    mentorName:
      asString(nested.mentorName) ?? asString(nested.MentorName) ?? "",
    studentId: asString(nested.studentId) ?? asString(nested.StudentId) ?? "",
    studentName:
      asString(nested.studentName) ?? asString(nested.StudentName) ?? "",
    lastMessagePreview:
      asString(nested.lastMessagePreview) ??
      asString(nested.LastMessagePreview) ??
      null,
    lastMessageAt:
      asString(nested.lastMessageAt) ?? asString(nested.LastMessageAt) ?? null,
    unreadCount: Number(nested.unreadCount ?? nested.UnreadCount ?? 0),
  };
};

export const normalizeDirectMessage = (
  payload: any,
): DirectMessageDto | null => {
  const nested = pickDirectPayloadObject(payload);
  if (!nested) return null;

  const messageId = asString(nested.messageId) ?? asString(nested.MessageId);
  const conversationId =
    asString(nested.conversationId) ?? asString(nested.ConversationId);
  if (!messageId || !conversationId) return null;

  const normalizedShare = normalizeDirectLearningPathShare(
    nested.learningPathShare ?? nested.LearningPathShare,
  );

  const rawMessageType =
    asString(nested.messageType) ?? asString(nested.MessageType);

  const content = asString(nested.content) ?? asString(nested.Content) ?? "";
  const contentIsSharePattern =
    /^shared learning path:\s*.+$/i.test(content) ||
    /^share learning path:\s*.+$/i.test(content) ||
    /^learning path shared:\s*.+$/i.test(content);

  const hasShareId =
    asString(nested.learningPathShareId) ??
    asString(nested.LearningPathShareId) ??
    normalizedShare?.shareId;

  const isShareType =
    rawMessageType === "LearningPathShare" ||
    contentIsSharePattern ||
    !!normalizedShare;

  const finalMessageType = isShareType
    ? "LearningPathShare"
    : ((rawMessageType ?? "Text") as DirectMessageDto["messageType"]);

  return {
    ...nested,
    messageId,
    conversationId,
    senderId: asString(nested.senderId) ?? asString(nested.SenderId) ?? "",
    content,
    messageType: finalMessageType,
    sentAt:
      asString(nested.sentAt) ??
      asString(nested.SentAt) ??
      new Date().toISOString(),
    deliveredAt:
      asString(nested.deliveredAt) ?? asString(nested.DeliveredAt) ?? null,
    seenAt: asString(nested.seenAt) ?? asString(nested.SeenAt) ?? null,
    replyToMessageId:
      asString(nested.replyToMessageId) ??
      asString(nested.ReplyToMessageId) ??
      null,
    replyToContent:
      asString(nested.replyToContent) ??
      asString(nested.ReplyToContent) ??
      null,
    replyToSenderId:
      asString(nested.replyToSenderId) ??
      asString(nested.ReplyToSenderId) ??
      null,
    learningPathShareId:
      asString(nested.learningPathShareId) ??
      asString(nested.LearningPathShareId) ??
      normalizedShare?.shareId ??
      null,
    learningPathTitle:
      asString(nested.learningPathTitle) ??
      asString(nested.LearningPathTitle) ??
      normalizedShare?.learningPathTitle ??
      null,
    learningPathDescription:
      asString(nested.learningPathDescription) ??
      asString(nested.LearningPathDescription) ??
      normalizedShare?.learningPathDescription ??
      null,
    shareStatus: (asString(nested.shareStatus) ??
      asString(nested.ShareStatus) ??
      normalizedShare?.status ??
      null) as DirectMessageDto["shareStatus"],
    pathId:
      asString(nested.pathId) ??
      asString(nested.PathId) ??
      normalizedShare?.pathId ??
      null,
    mentorName:
      asString(nested.mentorName) ??
      asString(nested.MentorName) ??
      normalizedShare?.mentorName ??
      null,
    studentName:
      asString(nested.studentName) ??
      asString(nested.StudentName) ??
      normalizedShare?.studentName ??
      null,
    respondedAt:
      asString(nested.respondedAt) ??
      asString(nested.RespondedAt) ??
      normalizedShare?.respondedAt ??
      null,
    learningPathShare: normalizedShare,
  };
};

const normalizeConversationListPayload = (
  payload: DirectConversationDto[] | { items: DirectConversationDto[] } | any,
): DirectConversationDto[] => {
  const candidates = [
    payload,
    payload?.items,
    payload?.data?.items,
    payload?.result?.items,
    payload?.conversations,
    payload?.data?.conversations,
    payload?.result?.conversations,
    payload?.data,
    payload?.result,
  ];
  const list = candidates.find((value) => Array.isArray(value)) ?? [];

  return (list as any[])
    .map((item) => normalizeDirectConversation(item))
    .filter((item): item is DirectConversationDto => !!item);
};

const normalizeDirectStatusPayload = (
  key: "deliveredAt" | "seenAt",
  arg1: any,
  arg2?: any,
  arg3?: any,
): {
  conversationId: string;
  messageId: string;
  deliveredAt?: string | null;
  seenAt?: string | null;
} | null => {
  if (typeof arg1 === "string" && typeof arg2 === "string") {
    return {
      conversationId: arg1,
      messageId: arg2,
      [key]: typeof arg3 === "string" ? arg3 : null,
    };
  }

  const payload = pickDirectPayloadObject(arg1);
  if (!payload) return null;

  const conversationId =
    asString(payload.conversationId) ?? asString(payload.ConversationId);
  const messageId = asString(payload.messageId) ?? asString(payload.MessageId);
  if (!conversationId || !messageId) return null;

  return {
    conversationId,
    messageId,
    deliveredAt:
      asString(payload.deliveredAt) ?? asString(payload.DeliveredAt) ?? null,
    seenAt: asString(payload.seenAt) ?? asString(payload.SeenAt) ?? null,
  };
};

function playNotificationSound() {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;

    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Ignore browsers/environments that do not allow AudioContext here.
  }
}

export interface UseChatHubOptions {
  onError?: (errorCode: string, errorMessage: string) => void;
  onNewMessageNotification?: (payload: NewMessageNotificationPayload) => void;
  onReceiveLearningPathShare?: (message: DirectMessageDto) => void;
  onMentorDashboardRecentMessageReceived?: (payload: any) => void;
}

export interface ChatHubRef {
  joinConversation(
    conversationId: string,
    page?: number,
    size?: number,
  ): Promise<void>;
  leaveConversation(conversationId: string): Promise<void>;
  sendMessage(
    conversationId: string,
    content: string,
    messageType?: "Text" | "Emoji",
    replyToMessageId?: string | null,
  ): Promise<void>;
  markDelivered(conversationId: string, messageId: string): Promise<void>;
  markSeen(conversationId: string, messageId: string): Promise<void>;
  requestConversations(): Promise<void>;
  requestChatContacts(): Promise<void>;
  startConversation(participantId: string): Promise<void>;
}

export function useChatHub(options: UseChatHubOptions = {}): ChatHubRef {
  const { onError, onNewMessageNotification, onReceiveLearningPathShare, onMentorDashboardRecentMessageReceived } =
    options;
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const joinedConversationIdsRef = useRef<Set<string>>(new Set());
  const store = useChatStore;

  function getConnection(): signalR.HubConnection {
    if (!connectionRef.current) {
      connectionRef.current = new signalR.HubConnectionBuilder()
        .withUrl(DIRECT_CHAT_HUB_URL, {
          accessTokenFactory: () => {
            try {
              return useAuthStore.getState().token ?? "";
            } catch {
              return "";
            }
          },
          withCredentials: true,
        } as signalR.IHttpConnectionOptions)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (ctx) =>
            ctx.previousRetryCount === 0
              ? 0
              : Math.min(1000 << ctx.previousRetryCount, 30000),
        })
        .configureLogging(signalR.LogLevel.None)
        .build();
    }
    return connectionRef.current;
  }

  async function ensureConnected() {
    const conn = getConnection();
    if (conn.state === signalR.HubConnectionState.Connected) return;

    const isConnectingOrReconnecting =
      conn.state === signalR.HubConnectionState.Connecting ||
      conn.state === signalR.HubConnectionState.Reconnecting;

    if (isConnectingOrReconnecting) {
      const maxWait = 10000;
      const startTime = Date.now();
      while (Date.now() - startTime < maxWait) {
        if (conn.state === signalR.HubConnectionState.Connected) return;
        if (conn.state === signalR.HubConnectionState.Disconnected) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    if (conn.state === signalR.HubConnectionState.Disconnected) {
      await conn.start();
    }
  }

  function normalizeMessagesPayload(
    arg1: any,
    arg2?: any,
  ): { conversationId: string; messages: DirectMessageDto[] } | null {
    const pickMessages = (payload: any): DirectMessageDto[] | null => {
      const candidates = [
        payload,
        payload?.items,
        payload?.data?.items,
        payload?.result?.items,
        payload?.messages,
        payload?.data?.messages,
        payload?.result?.messages,
        payload?.data,
        payload?.result,
      ];
      const list = candidates.find((value) => Array.isArray(value));
      if (!Array.isArray(list)) return null;

      return list
        .map((item) => normalizeDirectMessage(item))
        .filter((item): item is DirectMessageDto => !!item);
    };

    if (typeof arg1 === "string") {
      const messages = pickMessages(arg2);
      if (messages) return { conversationId: arg1, messages };
    }

    if (arg1 && typeof arg1 === "object") {
      const conversationId =
        asString(arg1.conversationId) ??
        asString(arg1.ConversationId) ??
        asString(arg1.data?.conversationId) ??
        asString(arg1.data?.ConversationId) ??
        asString(arg1.result?.conversationId) ??
        asString(arg1.result?.ConversationId);
      const messages = pickMessages(arg1);
      if (conversationId && messages) return { conversationId, messages };
    }

    return null;
  }

  useEffect(() => {
    let mounted = true;
    const conn = getConnection();

    conn.onreconnected(async () => {
      const conversationIds = Array.from(joinedConversationIdsRef.current);
      await Promise.all(
        conversationIds.map((conversationId) =>
          conn
            .invoke("JoinConversation", conversationId, 1, 30)
            .catch(() => {}),
        ),
      );
    });

    conn.on(
      "ConversationsLoaded",
      (
        payload: DirectConversationDto[] | { items: DirectConversationDto[] },
      ) => {
        if (!mounted) return;
        store
          .getState()
          .setConversations(normalizeConversationListPayload(payload));
      },
    );

    conn.on("ConversationStarted", (payload: any) => {
      if (!mounted) return;
      const conv = normalizeDirectConversation(payload);
      if (!conv) return;
      store.getState().upsertConversation(conv);
    });

    conn.on("ConversationMessagesLoaded", (arg1: any, arg2?: any) => {
      if (!mounted) return;
      const normalized = normalizeMessagesPayload(arg1, arg2);
      if (!normalized) return;
      store
        .getState()
        .setMessages(normalized.conversationId, normalized.messages);
    });

    conn.on(
      "ReceiveMessage",
      (
        payload:
          | DirectMessageDto
          | { message?: DirectMessageDto; data?: DirectMessageDto },
      ) => {
        if (!mounted) return;
        const message = normalizeDirectMessage(payload);
        if (!message) return;

        store.getState().appendMessage(message.conversationId, message);

        if (message.messageType === "LearningPathShare") {
          onReceiveLearningPathShare?.(message);
        }
      },
    );

    conn.on("ConversationUpdated", (payload: any) => {
      if (!mounted) return;
      const conv = normalizeDirectConversation(payload);
      if (!conv) return;
      store.getState().upsertConversation(conv);
    });

    conn.on(
      "UnreadCountUpdated",
      (data: { totalUnreadCount?: number; conversationId?: string }) => {
        if (!mounted) return;
        if (typeof data?.totalUnreadCount === "number") {
          store.getState().setGlobalUnreadCount(data.totalUnreadCount);
        } else if (data?.conversationId) {
          getUnreadCount()
            .then((res) =>
              store.getState().setGlobalUnreadCount(res?.totalUnreadCount ?? 0),
            )
            .catch(() => {});
        }
      },
    );

    conn.on("MessageDelivered", (arg1: any, arg2?: any, arg3?: any) => {
      if (!mounted) return;
      const data = normalizeDirectStatusPayload(
        "deliveredAt",
        arg1,
        arg2,
        arg3,
      );
      if (!data) return;
      store
        .getState()
        .updateMessageStatus(data.conversationId, data.messageId, {
          deliveredAt: data.deliveredAt,
        });
    });

    conn.on("MessageSeen", (arg1: any, arg2?: any, arg3?: any) => {
      if (!mounted) return;
      const data = normalizeDirectStatusPayload("seenAt", arg1, arg2, arg3);
      if (!data) return;
      store
        .getState()
        .updateMessageStatus(data.conversationId, data.messageId, {
          seenAt: data.seenAt,
        });
    });

    conn.on(
      "NewMessageNotification",
      (payload: NewMessageNotificationPayload) => {
        if (!mounted) return;
        store.getState().incrementGlobalUnreadCount(payload.badgeIncrement);
        if (payload.playSound) playNotificationSound();
        onNewMessageNotification?.(payload);
      },
    );

    conn.on("MentorDashboardRecentMessageReceived", (payload: any) => {
      if (!mounted) return;
      onMentorDashboardRecentMessageReceived?.(payload);
    });

    conn.on("ChatContactsLoaded", (_contacts: unknown) => {
      // Contacts are still handled by the page via REST fetch.
    });

    conn.on(
      "DirectChatError",
      (err: { errorCode: string; errorMessage: string }) => {
        if (!mounted) return;
        onError?.(err.errorCode, err.errorMessage);
      },
    );

    ensureConnected().catch(() => {});

    return () => {
      mounted = false;
      conn.off("ConversationsLoaded");
      conn.off("ConversationStarted");
      conn.off("ConversationMessagesLoaded");
      conn.off("ReceiveMessage");
      conn.off("ConversationUpdated");
      conn.off("UnreadCountUpdated");
      conn.off("MessageDelivered");
      conn.off("MessageSeen");
      conn.off("NewMessageNotification");
      conn.off("ChatContactsLoaded");
      conn.off("DirectChatError");
      conn.off("MentorDashboardRecentMessageReceived");
      joinedConversationIdsRef.current.clear();
      conn.stop().catch(() => {});
      connectionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinConversation = useCallback(
    async (conversationId: string, page = 1, size = 30) => {
      await ensureConnected();
      joinedConversationIdsRef.current.add(conversationId);
      return connectionRef.current!.invoke(
        "JoinConversation",
        conversationId,
        page,
        size,
      );
    },
    [],
  );

  const leaveConversation = useCallback(async (conversationId: string) => {
    await ensureConnected();
    joinedConversationIdsRef.current.delete(conversationId);
    return connectionRef.current!.invoke("LeaveConversation", conversationId);
  }, []);

  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string,
      messageType: "Text" | "Emoji" = "Text",
      replyToMessageId: string | null = null,
    ) => {
      await ensureConnected();
      return connectionRef.current!.invoke(
        "SendMessage",
        conversationId,
        content,
        messageType,
        replyToMessageId,
      );
    },
    [],
  );

  const markDelivered = useCallback(
    async (conversationId: string, messageId: string) => {
      await ensureConnected();
      return connectionRef.current!.invoke(
        "MarkDelivered",
        conversationId,
        messageId,
      );
    },
    [],
  );

  const markSeen = useCallback(
    async (conversationId: string, messageId: string) => {
      await ensureConnected();
      return connectionRef.current!.invoke(
        "MarkSeen",
        conversationId,
        messageId,
      );
    },
    [],
  );

  const requestConversations = useCallback(async () => {
    await ensureConnected();
    return connectionRef.current!.invoke("RequestConversations");
  }, []);

  const requestChatContacts = useCallback(async () => {
    await ensureConnected();
    return connectionRef.current!.invoke("RequestChatContacts");
  }, []);

  const startConversation = useCallback(async (participantId: string) => {
    await ensureConnected();
    return connectionRef.current!.invoke("StartConversation", participantId);
  }, []);

  return {
    joinConversation,
    leaveConversation,
    sendMessage,
    markDelivered,
    markSeen,
    requestConversations,
    requestChatContacts,
    startConversation,
  };
}
