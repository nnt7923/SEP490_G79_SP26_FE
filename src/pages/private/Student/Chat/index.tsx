import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Gift,
  Hash,
  MessageSquare,
  Reply,
  Smile,
  Users,
} from "lucide-react";
import Layout from "../../../../components/Layout";
import ChannelChatPage from "../../../../components/ChannelChat/ChannelChatPage";
import { useStudentSidebarConfig } from "../../Student/components/StudentSideBar";
import useAuthStore from "../../../../store/useAuthStore";
import useChatStore from "../../../../store/useChatStore";
import { useLocation, useNavigate } from "react-router-dom";
import ROUTER from "../../../../router/ROUTER";
import { useChatHub } from "../../../../hooks/useChatHub";
import {
  getPendingShares,
  getSentShares,
  getSharePreview,
} from "../../../../services/LearningPathShareService";
import {
  createOrGetConversation,
  getContacts,
  getConversations,
  getMessages,
  sendMessageRest,
} from "../../../../services/DirectChatService";
import MessageStatusIcon from "../../../../components/Chat/MessageStatusIcon";
import type {
  AskMentorContextPayload,
  DirectChatContactDto,
  DirectMessageDto,
  LearningPathShareCardData,
  ShareStatus,
} from "../../../../types/chat";
import { getMessageStatus } from "../../../../types/chat";
import { useTheme } from "../../../../contexts/ThemeContext";
import Toast from "../../../../components/Toast";
import {
  MainContainer,
  Sidebar as ChatSidebar,
  ChatContainer,
  ConversationList as ChatConversationList,
  Conversation,
  ConversationHeader,
  MessageList,
  Message,
  MessageInput,
  InputToolbox,
  Avatar,
  Search,
} from "@chatscope/chat-ui-kit-react";
import EmojiPicker, { Theme as EmojiTheme } from "emoji-picker-react";
import ChatReplyPreview from "../../../../components/Chat/ChatReplyPreview";
import LearningPathShareCard from "../../../../components/Chat/LearningPathShareCard";
import {
  buildLearningPathShareCardData,
  isLearningPathShareMessage,
  normalizeShareId,
} from "../../../../components/Chat/learningPathShare";
import {
  buildReplyDraft,
  buildReplyPreviewForMessage,
  getReplyPreviewText,
  isReplyableMessage,
  type ReplyDraft,
  normalizeChatMessageContent,
} from "../../../../components/Chat/chatReply";
import {
  formatAskMentorContextMessage,
  isValidAskMentorContextPayload,
} from "../../../../utils/askMentorContext";

type ToastState = {
  message: string;
  type: "success" | "error" | "warning" | "info";
};
type ChatRouteState = {
  conversationId?: string;
  activeTab?: "conversations" | "invites" | "contacts";
  toast?: ToastState;
  askMentorContext?: AskMentorContextPayload;
};
interface StudentChatPageProps {
  initialView?: "direct" | "community";
}

function formatConversationTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function getMessagePosition(
  messages: DirectMessageDto[],
  idx: number,
): "single" | "first" | "normal" | "last" {
  const current = messages[idx];
  const prev = messages[idx - 1];
  const next = messages[idx + 1];
  const samePrev = prev && prev.senderId === current.senderId;
  const sameNext = next && next.senderId === current.senderId;
  if (!samePrev && !sameNext) return "single";
  if (!samePrev && sameNext) return "first";
  if (samePrev && sameNext) return "normal";
  return "last";
}

const StudentChatPage: React.FC<StudentChatPageProps> = ({
  initialView = "direct",
}) => {
  const { t } = useTranslation("student");
  const { t: tc } = useTranslation("common");
  const { theme } = useTheme();
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation() as { state?: ChatRouteState };

  const {
    conversationsById,
    conversationOrder,
    messagesByConversationId,
    activeConversationId,
    setActiveConversation,
    setConversations,
    setMessages,
    pendingLearningPathShares,
    receivedLearningPathShares,
    setPendingShares,
    reconcilePendingShares,
    patchShareMessage,
    removePendingShare,
    upsertReceivedShare,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"direct" | "community">(
    initialView,
  );
  const [activeTab, setActiveTab] = useState<
    "conversations" | "invites" | "contacts"
  >("conversations");
  const [inviteStatusFilter, setInviteStatusFilter] = useState<
    "" | ShareStatus
  >("");
  const [contacts, setContacts] = useState<DirectChatContactDto[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [replyDraft, setReplyDraft] = useState<ReplyDraft | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(
    location.state?.toast ?? null,
  );
  const readAskMentorContextFromStorage = (): AskMentorContextPayload | null => {
    try {
      const raw = sessionStorage.getItem("plans.askMentorContext");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AskMentorContextPayload;
      return isValidAskMentorContextPayload(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };
  const [requestedConversationId, setRequestedConversationId] = useState<
    string | null
  >(location.state?.conversationId ?? null);
  const [requestedMentorId, setRequestedMentorId] = useState<string | null>(
    location.state?.selectedMentorId ?? null,
  );
  const [askMentorContext, setAskMentorContext] =
    useState<AskMentorContextPayload | null>(
      location.state?.askMentorContext ?? readAskMentorContextFromStorage(),
    );
  const deliveredRef = useRef<Set<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());
  const hydratedShareIdsRef = useRef<Set<string>>(new Set());
  const hydratingShareIdsRef = useRef<Set<string>>(new Set());
  const sentAskMentorKeysRef = useRef<Set<string>>(new Set());
  const messageListId = "student-chat-message-list";
  const messageInputRef = useRef<any>(null);

  const currentUserId = String(user?.id ?? "");

  const conversations = conversationOrder
    .map((id) => conversationsById[id])
    .filter(Boolean);
  const activeMessages = activeConversationId
    ? (messagesByConversationId[activeConversationId] ?? [])
    : [];
  const activeConv = activeConversationId
    ? conversationsById[activeConversationId]
    : null;
  const otherName = activeConv
    ? activeConv.mentorId === currentUserId
      ? activeConv.studentName
      : activeConv.mentorName
    : "";
  const receivedShareById = useMemo(
    () =>
      new Map(
        receivedLearningPathShares.map((share) => [
          normalizeShareId(share.shareId),
          share,
        ]),
      ),
    [receivedLearningPathShares],
  );

  const resolveStudentShareCardData = useCallback(
    (message: DirectMessageDto): LearningPathShareCardData | null => {
      const directShareCardData = buildLearningPathShareCardData(
        message,
        pendingLearningPathShares,
      );
      if (!directShareCardData) return null;

      const latestShare = receivedShareById.get(
        normalizeShareId(directShareCardData.shareId),
      );
      if (!latestShare) return directShareCardData;

      return {
        ...directShareCardData,
        pathId: latestShare.pathId ?? directShareCardData.pathId,
        title: latestShare.learningPathTitle ?? directShareCardData.title,
        description:
          latestShare.learningPathDescription ??
          directShareCardData.description,
        mentorName: latestShare.mentorName ?? directShareCardData.mentorName,
        status: latestShare.status ?? directShareCardData.status,
        sentAt: latestShare.sentAt ?? directShareCardData.sentAt,
        respondedAt: latestShare.respondedAt ?? directShareCardData.respondedAt,
      };
    },
    [pendingLearningPathShares, receivedShareById],
  );

  const replyContext = {
    currentUserId,
    otherParticipantName: otherName || t("chat.title"),
    youLabel: t("chat.you", { defaultValue: "You" }),
    unavailableLabel: t("chat.replyUnavailable", {
      defaultValue: "Tin nhắn đã bị xóa hoặc không còn khả dụng",
    }),
    sharedLearningPathLabel: t("chat.sharedLearningPath", {
      defaultValue: "Learning path share",
    }),
    pendingShares: pendingLearningPathShares,
    resolveShareCardData: resolveStudentShareCardData,
  };
  const composerPlaceholder = replyDraft
    ? `${t("chat.replyingTo", { name: replyDraft.preview.senderLabel })}: ${getReplyPreviewText(replyDraft.preview)}`
    : t("chat.typePlaceholder");

  const filteredConversations = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => {
      const name =
        (c.mentorId === currentUserId ? c.studentName : c.mentorName) ?? "";
      return name.toLowerCase().includes(q);
    });
  }, [conversations, currentUserId, searchQuery]);

  const filteredReceivedShares = useMemo(() => {
    const items = inviteStatusFilter
      ? receivedLearningPathShares.filter(
          (share) => share.status === inviteStatusFilter,
        )
      : receivedLearningPathShares;

    return [...items].sort((left, right) => {
      const rightTime = Date.parse(right.sentAt || "") || 0;
      const leftTime = Date.parse(left.sentAt || "") || 0;
      return rightTime - leftTime;
    });
  }, [inviteStatusFilter, receivedLearningPathShares]);

  const hub = useChatHub({
    onError: (code) => {
      if (code === "UNAUTHORIZED") {
        logout();
        navigate(ROUTER.LOGIN);
      }
    },
    onReceiveLearningPathShare: (message) => {
      const title =
        message.learningPathTitle ||
        message.content.replace(/^shared learning path:\s*/i, "") ||
        t("chat.sharedLearningPath", { defaultValue: "Learning path share" });
      setToast({
        message: t("chat.newShareReceived", {
          title,
          defaultValue: "New learning path shared: {{title}}",
        }),
        type: "info",
      });
    },
  });

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  useEffect(() => {
    hub.requestConversations();
    getConversations()
      .then(setConversations)
      .catch(() => {});
    getPendingShares()
      .then((shares) => {
        setPendingShares(shares);
        reconcilePendingShares(shares);
      })
      .catch(() => {});
    // Load ALL received shares (including Accepted/Rejected) để hiển thị đúng status
    getSentShares()
      .then((sentShares) => {
        sentShares.forEach((share) => {
          upsertReceivedShare({
            shareId: share.shareId,
            pathId: share.acceptedPathId ?? share.pathId,
            learningPathTitle: share.learningPathTitle,
            learningPathDescription: share.learningPathDescription,
            mentorId: share.mentorId ?? "",
            mentorName: share.mentorName ?? "",
            status: share.status,
            sentAt: share.sentAt,
            respondedAt: share.respondedAt,
          });
          if (share.status !== "Pending") {
            removePendingShare(share.shareId);
          }
          if (share.status === "Pending") {
            patchShareMessage(share.shareId, {
              shareStatus: share.status,
              respondedAt: null,
              pathId: share.pathId,
              learningPathTitle: share.learningPathTitle,
              learningPathDescription: share.learningPathDescription,
              mentorName: share.mentorName ?? undefined,
            });
          } else {
            patchShareMessage(share.shareId, {
              shareStatus: share.status,
              respondedAt: share.respondedAt,
              pathId: share.acceptedPathId ?? share.pathId,
              learningPathTitle: share.learningPathTitle,
              learningPathDescription: share.learningPathDescription,
              mentorName: share.mentorName ?? undefined,
            });
          }
        });
      })
      .catch(() => {});
    getContacts()
      .then((c) => setContacts(c.filter((u) => u.roleName === "Mentor")))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!location.state) return;
    if (location.state.toast) setToast(location.state.toast);
    if (location.state.activeTab) setActiveTab(location.state.activeTab);
    if (location.state.conversationId)
      setRequestedConversationId(location.state.conversationId);
    if (location.state.selectedMentorId)
      setRequestedMentorId(location.state.selectedMentorId);
    if (location.state.askMentorContext)
      setAskMentorContext(location.state.askMentorContext);
    if (!location.state.askMentorContext) {
      const cachedContext = readAskMentorContextFromStorage();
      if (cachedContext) setAskMentorContext(cachedContext);
    }
    if (
      location.state.toast ||
      location.state.activeTab ||
      location.state.conversationId ||
      location.state.selectedMentorId ||
      location.state.askMentorContext
    ) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (requestedConversationId && conversationsById[requestedConversationId]) {
      setActiveConversation(requestedConversationId);
      setRequestedConversationId(null);
      return;
    }
    if (!activeConversationId && conversationOrder.length > 0) {
      setActiveConversation(conversationOrder[0]);
    }
  }, [
    activeConversationId,
    conversationOrder,
    conversationsById,
    requestedConversationId,
    setActiveConversation,
  ]);

  // Auto-start conversation with requested mentor (from SelectMentorModal)
  useEffect(() => {
    if (!requestedMentorId) return;
    handleStartConversation(requestedMentorId);
    setRequestedMentorId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedMentorId]);

  useEffect(() => {
    if (!activeConversationId) return;
    hub.joinConversation(activeConversationId).catch(() => {});
    getMessages(activeConversationId)
      .then((res) => setMessages(activeConversationId, res?.items ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConv?.mentorId) return;

    activeMessages.forEach((message) => {
      const shareCardData = isLearningPathShareMessage(message)
        ? resolveStudentShareCardData(message)
        : null;

      if (!shareCardData) return;

      const currentShare = receivedShareById.get(
        normalizeShareId(shareCardData.shareId),
      );
      if (
        currentShare &&
        currentShare.pathId === (shareCardData.pathId ?? "") &&
        currentShare.learningPathTitle === shareCardData.title &&
        currentShare.learningPathDescription ===
          (shareCardData.description ?? null) &&
        currentShare.mentorName ===
          (shareCardData.mentorName || activeConv.mentorName) &&
        currentShare.status === shareCardData.status &&
        currentShare.sentAt === (shareCardData.sentAt || message.sentAt) &&
        currentShare.respondedAt === (shareCardData.respondedAt ?? null)
      ) {
        return;
      }

      upsertReceivedShare({
        shareId: shareCardData.shareId,
        pathId: shareCardData.pathId ?? "",
        learningPathTitle: shareCardData.title,
        learningPathDescription: shareCardData.description ?? null,
        mentorId: activeConv.mentorId,
        mentorName: shareCardData.mentorName || activeConv.mentorName,
        status: shareCardData.status,
        sentAt: shareCardData.sentAt || message.sentAt,
        respondedAt: shareCardData.respondedAt ?? null,
      });
    });
  }, [
    activeConv?.mentorId,
    activeConv?.mentorName,
    activeMessages,
    receivedShareById,
    resolveStudentShareCardData,
    upsertReceivedShare,
  ]);

  useEffect(() => {
    if (!activeMessages.length) return;

    const pendingShareIds = new Set(
      pendingLearningPathShares.map((share) => normalizeShareId(share.shareId)),
    );
    const candidateShareIds = Array.from(
      new Set(
        activeMessages
          .filter(isLearningPathShareMessage)
          .map((message) => resolveStudentShareCardData(message))
          .filter((share): share is LearningPathShareCardData => !!share)
          .filter(
            (share) =>
              share.status === "Pending" &&
              !pendingShareIds.has(normalizeShareId(share.shareId)),
          )
          .map((share) => share.shareId),
      ),
    );

    candidateShareIds.forEach((shareId) => {
      const normalizedShareId = normalizeShareId(shareId);
      if (!normalizedShareId) return;
      if (
        hydratedShareIdsRef.current.has(normalizedShareId) ||
        hydratingShareIdsRef.current.has(normalizedShareId)
      )
        return;

      hydratingShareIdsRef.current.add(normalizedShareId);

      getSharePreview(shareId)
        .then((preview) => {
          patchShareMessage(preview.shareId, {
            shareStatus: preview.status,
            respondedAt: preview.respondedAt ?? null,
            learningPathTitle: preview.learningPath?.title ?? null,
            learningPathDescription: preview.learningPath?.description ?? null,
            pathId: preview.learningPath?.pathId ?? null,
            mentorName: preview.mentorName,
            studentName: preview.studentName,
          });

          upsertReceivedShare({
            shareId: preview.shareId,
            pathId: preview.learningPath?.pathId ?? "",
            learningPathTitle:
              preview.learningPath?.title ?? t("myPlans.untitled"),
            learningPathDescription: preview.learningPath?.description ?? null,
            mentorId: preview.mentorId,
            mentorName: preview.mentorName,
            status: preview.status,
            sentAt: preview.sentAt,
            respondedAt: preview.respondedAt ?? null,
          });

          if (preview.status !== "Pending") {
            removePendingShare(preview.shareId);
          }

          hydratedShareIdsRef.current.add(normalizedShareId);
        })
        .catch((err) => {
          const code =
            err?.response?.data?.errorCode || err?.response?.data?.code;
          // Share đã được quyết định, getSharePreview bị block — lấy status thực từ getSentShares
          if (code === "SHARE_ALREADY_DECIDED") {
            getSentShares()
              .then((sentShares) => {
                const match = sentShares.find(
                  (s) => normalizeShareId(s.shareId) === normalizedShareId,
                );
                if (match && match.status !== "Pending") {
                  patchShareMessage(match.shareId, {
                    shareStatus: match.status,
                    respondedAt: match.respondedAt,
                    pathId: match.acceptedPathId ?? match.pathId,
                    learningPathTitle: match.learningPathTitle,
                    learningPathDescription: match.learningPathDescription,
                    mentorName: match.mentorName ?? undefined,
                  });
                  upsertReceivedShare({
                    shareId: match.shareId,
                    pathId: match.acceptedPathId ?? match.pathId,
                    learningPathTitle: match.learningPathTitle,
                    learningPathDescription: match.learningPathDescription,
                    mentorId: match.mentorId ?? "",
                    mentorName: match.mentorName ?? "",
                    status: match.status,
                    sentAt: match.sentAt,
                    respondedAt: match.respondedAt,
                  });
                  removePendingShare(match.shareId);
                  hydratedShareIdsRef.current.add(normalizedShareId);
                }
              })
              .catch(() => {});
          }
        })
        .finally(() => {
          hydratingShareIdsRef.current.delete(normalizedShareId);
        });
    });
  }, [
    activeMessages,
    patchShareMessage,
    pendingLearningPathShares,
    removePendingShare,
    resolveStudentShareCardData,
    t,
    upsertReceivedShare,
  ]);

  useEffect(() => {
    deliveredRef.current.clear();
    seenRef.current.clear();
    setShowEmoji(false);
    setInputValue("");
    setReplyDraft(null);
  }, [activeConversationId]);

  useEffect(() => {
    const root = document.getElementById(messageListId);
    if (!root) return;
    const container = root.querySelector(
      ".cs-message-list__scroll-wrapper",
    ) as HTMLDivElement | null;
    if (!container) return;

    const handleScroll = () => {
      const atBottom =
        Math.abs(
          container.scrollHeight - container.scrollTop - container.clientHeight,
        ) < 4;
      setIsAtBottom(atBottom);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeConversationId, activeMessages.length, messageListId]);

  useEffect(() => {
    if (!activeConversationId || activeMessages.length === 0) return;
    const canMarkSeen =
      isAtBottom && (typeof document === "undefined" || document.hasFocus());
    for (const msg of activeMessages) {
      if (msg.senderId === currentUserId) continue;
      if (!msg.deliveredAt && !deliveredRef.current.has(msg.messageId)) {
        deliveredRef.current.add(msg.messageId);
        hub.markDelivered(activeConversationId, msg.messageId).catch(() => {
          deliveredRef.current.delete(msg.messageId);
        });
      }
      if (canMarkSeen && !msg.seenAt && !seenRef.current.has(msg.messageId)) {
        seenRef.current.add(msg.messageId);
        hub.markSeen(activeConversationId, msg.messageId).catch(() => {
          seenRef.current.delete(msg.messageId);
        });
      }
    }
  }, [activeConversationId, activeMessages, isAtBottom, currentUserId]);

  const handleSelectConversation = (id: string) => {
    if (activeConversationId && activeConversationId !== id) {
      hub.leaveConversation(activeConversationId).catch(() => {});
    }
    setActiveConversation(id);
  };

  const handleStartConversation = async (participantId: string) => {
    try {
      let targetConvId = null;
      const existingConv = Object.values(
        useChatStore.getState().conversationsById,
      ).find(
        (c) => c.mentorId === participantId || c.studentId === participantId,
      );
      if (existingConv) {
        targetConvId = existingConv.conversationId;
      }

      if (!targetConvId) {
        try {
          const conversation = await createOrGetConversation(participantId);
          if (conversation?.conversationId) {
            targetConvId = conversation.conversationId;
            useChatStore.getState().upsertConversation(conversation);
          }
        } catch {}
      }

      if (!targetConvId) {
        const result = (await hub.startConversation(participantId)) as any;
        if (result && typeof result === "string") {
          targetConvId = result;
        } else if (result && typeof result === "object") {
          targetConvId = result.conversationId || result.ConversationId;
        }
      }

      setActiveTab("conversations");
      setSearchQuery("");

      if (targetConvId) {
        setActiveConversation(targetConvId);

        if (askMentorContext) {
          const messagePayload =
            formatAskMentorContextMessage(askMentorContext);
          const dedupeKey = `${participantId}:${JSON.stringify(askMentorContext)}`;
          if (!sentAskMentorKeysRef.current.has(dedupeKey)) {
            sentAskMentorKeysRef.current.add(dedupeKey);
            if (!isValidAskMentorContextPayload(askMentorContext)) {
              setToast({
                message: t("chat.askMentorContextInvalid", {
                  defaultValue:
                    "Plan context is incomplete. You can continue messaging mentor manually.",
                }),
                type: "warning",
              });
              setAskMentorContext(null);
              return;
            }

            let sent = false;
            try {
              await hub.joinConversation(targetConvId).catch(() => {});
              await hub.sendMessage(
                targetConvId,
                messagePayload,
                "Text",
                null,
              );
              sent = true;
            } catch {
              try {
                await sendMessageRest(
                  targetConvId,
                  messagePayload,
                  "Text",
                  null,
                );
                sent = true;
              } catch {
                // handled below
              }
            }

            try {
              const latestMessages = await getMessages(targetConvId);
              setMessages(targetConvId, latestMessages?.items ?? []);
            } catch {}
            getConversations().then(setConversations).catch(() => {});

            if (sent) {
              setToast({
                message: t("chat.askMentorContextSent", {
                  defaultValue:
                    "Plan context was sent to mentor automatically.",
                }),
                type: "success",
              });
              setAskMentorContext(null);
              try {
                sessionStorage.removeItem("plans.askMentorContext");
              } catch {}
            } else {
              sentAskMentorKeysRef.current.delete(dedupeKey);
              setToast({
                message: t("chat.askMentorContextSendFailed", {
                  defaultValue:
                    "Could not send plan context automatically. You can continue messaging mentor manually.",
                }),
                type: "warning",
              });
            }
          }
        }
      } else if (askMentorContext) {
        setToast({
          message: t("chat.askMentorConversationMissing", {
            defaultValue:
              "Could not open mentor conversation for auto context send.",
          }),
          type: "warning",
        });
      }
    } catch {
      if (askMentorContext) {
        setToast({
          message: t("chat.askMentorContextSendFailed", {
            defaultValue:
              "Could not send plan context automatically. You can continue messaging mentor manually.",
            }),
          type: "warning",
        });
      }
    }
  };

  const handleReplyToMessage = (message: DirectMessageDto) => {
    const draft = buildReplyDraft(message, replyContext);
    if (!draft) return;
    setReplyDraft(draft);
    setShowEmoji(false);
    messageInputRef.current?.focus?.();
  };

  const handleSend = async (content: string, type: "Text" | "Emoji") => {
    if (!activeConversationId) return;
    await hub.sendMessage(
      activeConversationId,
      content,
      type,
      replyDraft?.messageId ?? null,
    );
    setReplyDraft(null);
  };

  const handleSendText = async (_innerHtml: string, textContent: string) => {
    if (!activeConversationId) return;
    const trimmed = textContent.trim();
    if (!trimmed) return;
    try {
      await handleSend(trimmed, "Text");
      setInputValue("");
    } catch {}
  };

  const openSharePreview = (shareId: string, from: "chat" | "invites") => {
    navigate(ROUTER.CHAT_SHARE_PREVIEW.replace(":shareId", shareId), {
      state: {
        from,
        conversationId:
          from === "chat" ? (activeConversationId ?? undefined) : undefined,
      },
    });
  };

  const navItems = useStudentSidebarConfig();
  const sidebarConfig = {
    navItems,
    actions: [],
    brand: { name: t("chat.title"), subtitle: "Mentor Chat" },
  };

  const pickerTheme = theme === "dark" ? EmojiTheme.DARK : EmojiTheme.LIGHT;
  const shareCardLabels = {
    pending: t("chat.pendingInvite"),
    accepted: t("chat.inviteAcceptedStatus", { defaultValue: "Accepted" }),
    rejected: t("chat.inviteRejectedStatus", { defaultValue: "Rejected" }),
    accept: t("chat.accept"),
    reject: t("chat.reject"),
    accepting: t("chat.accepting"),
    rejecting: t("chat.rejecting"),
    preview: t("chat.previewCta", { defaultValue: "Preview" }),
    viewPath: t("chat.viewPath", { defaultValue: "View learning path" }),
    shareFrom: (mentorName?: string | null) =>
      t("chat.inviteFrom", {
        mentorName: mentorName || otherName || t("chat.title"),
      }),
  };

  const inviteStatusFilters: Array<{ value: "" | ShareStatus; label: string }> =
    [
      { value: "", label: t("chat.invitesAll", { defaultValue: "Tất cả" }) },
      { value: "Pending", label: t("chat.pendingInvite") },
      {
        value: "Accepted",
        label: t("chat.inviteAcceptedStatus", { defaultValue: "Đã chấp nhận" }),
      },
      {
        value: "Rejected",
        label: t("chat.inviteRejectedStatus", { defaultValue: "Đã từ chối" }),
      },
    ];

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="chat-kit-page">
        <div className="chat-kit-tabs" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="chat-kit-tab"
            aria-pressed={activeView === "direct"}
            onClick={() => setActiveView("direct")}
          >
            <MessageSquare size={14} />
            {t("chat.title")}
          </button>
          <button
            type="button"
            className="chat-kit-tab"
            aria-pressed={activeView === "community"}
            onClick={() => setActiveView("community")}
          >
            <Hash size={14} />
            {t("channelChat.title", { defaultValue: "Community" })}
          </button>
        </div>

        {activeView === "community" ? (
          <ChannelChatPage role="Student" sidebarNavItems={navItems} embedded />
        ) : (
          <MainContainer responsive className="chat-kit-container">
            <ChatSidebar
              position="left"
              scrollable={false}
              className="chat-kit-sidebar"
            >
              <div className="chat-kit-sidebar-header">
                <div className="chat-kit-tabs">
                  {(
                    [
                      {
                        key: "conversations",
                        icon: <MessageSquare size={14} />,
                        label: t("chat.conversations"),
                      },
                      {
                        key: "contacts",
                        icon: <Users size={14} />,
                        label: t("chat.contacts", { defaultValue: "Mentors" }),
                      },
                      {
                        key: "invites",
                        icon: <Gift size={14} />,
                        label: t("chat.invites"),
                        badge: pendingLearningPathShares.length,
                      },
                    ] as const
                  ).map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        aria-pressed={isActive}
                        className="chat-kit-tab"
                      >
                        {tab.icon}
                        {tab.label}
                        {"badge" in tab && tab.badge > 0 && (
                          <span className="chat-kit-badge">{tab.badge}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="chat-kit-sidebar-body">
                {activeTab === "conversations" ? (
                  <>
                    <div className="chat-kit-search">
                      <Search
                        value={searchQuery}
                        onChange={setSearchQuery}
                        onClearClick={() => setSearchQuery("")}
                        placeholder={t("chat.searchPlaceholder")}
                      />
                    </div>
                    {filteredConversations.length === 0 ? (
                      <div className="chat-kit-empty chat-kit-empty--fill">
                        {t("chat.noConversation")}
                      </div>
                    ) : (
                      <ChatConversationList>
                        {filteredConversations.map((conv) => {
                          const name =
                            conv.mentorId === currentUserId
                              ? conv.studentName
                              : conv.mentorName;
                          const initials = getInitials(name);
                          return (
                            <Conversation
                              key={conv.conversationId}
                              name={name}
                              info={conv.lastMessagePreview ?? ""}
                              lastActivityTime={formatConversationTime(
                                conv.lastMessageAt,
                              )}
                              unreadCnt={conv.unreadCount}
                              active={
                                conv.conversationId === activeConversationId
                              }
                              onClick={() =>
                                handleSelectConversation(conv.conversationId)
                              }
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleSelectConversation(conv.conversationId);
                                }
                              }}
                            >
                              <Avatar>
                                <span className="chat-kit-avatar">
                                  {initials}
                                </span>
                              </Avatar>
                            </Conversation>
                          );
                        })}
                      </ChatConversationList>
                    )}
                  </>
                ) : activeTab === "contacts" ? (
                  <div className="chat-kit-contact-list">
                    {contacts.length === 0 ? (
                      <div className="chat-kit-empty">
                        {t("chat.noContacts", {
                          defaultValue: "No mentors found",
                        })}
                      </div>
                    ) : (
                      contacts.map((contact) => (
                        <div
                          key={contact.userId}
                          onClick={() =>
                            handleStartConversation(contact.userId)
                          }
                          className="chat-kit-contact-item"
                        >
                          <div className="chat-kit-contact-avatar">
                            {contact.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="chat-kit-contact-name">
                              {contact.username}
                            </div>
                            <div className="chat-kit-contact-role">
                              {t("chat.mentor", { defaultValue: "Mentor" })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="chat-kit-invite-list">
                    <div
                      className="chat-kit-sent-shares-chips"
                      style={{ marginBottom: 10 }}
                    >
                      {inviteStatusFilters.map((filter) => (
                        <button
                          key={filter.value || "all"}
                          type="button"
                          className={`chat-kit-sent-shares-chip ${inviteStatusFilter === filter.value ? "is-active" : ""}`}
                          onClick={() => setInviteStatusFilter(filter.value)}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    {filteredReceivedShares.length === 0 ? (
                      <div className="chat-kit-empty">
                        {t("chat.noInvites")}
                      </div>
                    ) : (
                      filteredReceivedShares.map((share) => (
                        <LearningPathShareCard
                          key={share.shareId}
                          data={{
                            shareId: share.shareId,
                            pathId: share.pathId,
                            title: share.learningPathTitle,
                            description: share.learningPathDescription,
                            mentorName: share.mentorName,
                            status: share.status,
                            sentAt: share.sentAt,
                            respondedAt: share.respondedAt,
                          }}
                          actionMode="invite"
                          onPreview={
                            share.status === 'Pending'
                              ? () => openSharePreview(share.shareId, 'invites')
                              : undefined
                          }
                          onViewPath={
                            share.pathId && share.status === "Accepted"
                              ? () =>
                                  navigate("/my-plans/detail", {
                                    state: { pathId: share.pathId },
                                  })
                              : undefined
                          }
                          labels={shareCardLabels}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            </ChatSidebar>

            <ChatContainer className="chat-kit-panel">
              <ConversationHeader>
                <Avatar>
                  <span className="chat-kit-avatar chat-kit-avatar--header">
                    {getInitials(otherName || t("chat.title"))}
                  </span>
                </Avatar>
                <ConversationHeader.Content
                  userName={
                    activeConversationId ? otherName || "..." : t("chat.title")
                  }
                />
              </ConversationHeader>

              <MessageList
                id={messageListId}
                className="chat-kit-message-list"
                autoScrollToBottom
                key={`student-msg-${activeConversationId}-${Date.now()}`}
              >
                {!activeConversationId ? (
                  <MessageList.Content>
                    <div className="chat-kit-empty">
                      {t("chat.noConversation")}
                    </div>
                  </MessageList.Content>
                ) : activeMessages.length === 0 ? (
                  <MessageList.Content>
                    <div className="chat-kit-empty">{t("chat.noMessages")}</div>
                  </MessageList.Content>
                ) : (
                  activeMessages.map((msg, idx) => {
                    const isMine = msg.senderId === currentUserId;
                    const position = getMessagePosition(activeMessages, idx);
                    const isLastMine =
                      isMine &&
                      !activeMessages
                        .slice(idx + 1)
                        .some((m) => m.senderId === currentUserId);
                    const displayContent = normalizeChatMessageContent(
                      msg.content,
                    );
                    const shareCardData = isLearningPathShareMessage(msg)
                      ? resolveStudentShareCardData(msg)
                      : null;
                    const replyPreview = buildReplyPreviewForMessage(
                      msg,
                      activeMessages,
                      replyContext,
                    );
                    if (shareCardData) {
                      return (
                        <div
                          key={msg.messageId}
                          className={`chat-kit-share-row chat-kit-share-row--${isMine ? "outgoing" : "incoming"}`}
                          data-chat-message-id={msg.messageId}
                          data-chat-share-id={shareCardData.shareId}
                        >
                          <div className="chat-kit-share-row__card">
                            {replyPreview && (
                              <ChatReplyPreview preview={replyPreview} />
                            )}
                            <LearningPathShareCard
                              data={shareCardData}
                              onPreview={
                                shareCardData.status === 'Pending'
                                  ? () => openSharePreview(shareCardData.shareId, 'chat')
                                  : undefined
                              }
                              extraActions={
                                isReplyableMessage(msg) ? (
                                  <button
                                    type="button"
                                    className="chat-kit-reply-action chat-kit-reply-action--share"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleReplyToMessage(msg);
                                    }}
                                  >
                                    <Reply size={14} />
                                    {t("chat.reply")}
                                  </button>
                                ) : undefined
                              }
                              labels={shareCardLabels}
                            />
                          </div>
                          <div
                            className={`chat-kit-share-row__footer chat-kit-share-row__footer--${isMine ? "outgoing" : "incoming"}`}
                          >
                            <span className="chat-kit-message-meta">
                              {formatMessageTime(msg.sentAt)}
                              {isMine && isLastMine && (
                                <MessageStatusIcon
                                  status={getMessageStatus(msg)}
                                />
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <Message
                        key={msg.messageId}
                        model={{
                          message: displayContent,
                          direction: isMine ? "outgoing" : "incoming",
                          position,
                        }}
                        type="text"
                      >
                        <Message.CustomContent>
                          <div className="chat-kit-message-body">
                            {replyPreview && (
                              <ChatReplyPreview preview={replyPreview} />
                            )}
                            <div className="chat-kit-message-text">
                              {displayContent}
                            </div>
                          </div>
                        </Message.CustomContent>
                        <Message.Footer>
                          <div className="chat-kit-message-footer-row">
                            <span className="chat-kit-message-meta">
                              {formatMessageTime(msg.sentAt)}
                              {isMine && isLastMine && (
                                <MessageStatusIcon
                                  status={getMessageStatus(msg)}
                                />
                              )}
                            </span>
                            {isReplyableMessage(msg) && (
                              <button
                                type="button"
                                className="chat-kit-reply-action"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleReplyToMessage(msg);
                                }}
                              >
                                <Reply size={12} />
                                {t("chat.reply")}
                              </button>
                            )}
                          </div>
                        </Message.Footer>
                      </Message>
                    );
                  })
                )}
              </MessageList>

              {replyDraft && (
                <div className="chat-kit-composer-reply">
                  <div className="chat-kit-composer-reply__label">
                    {t("chat.replyingTo", {
                      name: replyDraft.preview.senderLabel,
                    })}
                  </div>
                  <ChatReplyPreview
                    preview={replyDraft.preview}
                    variant="composer"
                    onClose={() => setReplyDraft(null)}
                  />
                </div>
              )}

              <MessageInput
                placeholder={composerPlaceholder}
                onSend={handleSendText}
                onChange={(_html, textContent) => setInputValue(textContent)}
                value={inputValue}
                activateAfterChange
                attachButton={false}
                disabled={!activeConversationId}
                sendDisabled={!activeConversationId}
                ref={messageInputRef}
              />

              <InputToolbox className="chat-kit-input-toolbox">
                <button
                  onClick={() =>
                    activeConversationId && setShowEmoji(!showEmoji)
                  }
                  className={`chat-kit-emoji-toggle ${showEmoji ? "is-active" : ""}`}
                  aria-label="Toggle emoji"
                  disabled={!activeConversationId}
                >
                  <Smile size={20} />
                </button>
                {showEmoji && activeConversationId && (
                  <div className="chat-kit-emoji-picker">
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        setInputValue((prev) => `${prev}${emojiData.emoji}`);
                        messageInputRef.current?.focus?.();
                      }}
                      theme={pickerTheme}
                      height={360}
                      width={360}
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                )}
              </InputToolbox>
            </ChatContainer>
          </MainContainer>
        )}
      </div>
      {toast && (
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 120 }}>
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </Layout>
  );
};

export default StudentChatPage;
