import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Hash,
  MessageSquare,
  Reply,
  Share2,
  Smile,
  Users,
} from "lucide-react";
import Layout from "../../../../components/Layout";
import ChannelChatPage from "../../../../components/ChannelChat/ChannelChatPage";
import { useMentorSidebarConfig } from "../components/MentorSideBar";
import useAuthStore from "../../../../store/useAuthStore";
import useChatStore from "../../../../store/useChatStore";
import { useLocation, useNavigate } from "react-router-dom";
import ROUTER from "../../../../router/ROUTER";
import { useChatHub } from "../../../../hooks/useChatHub";
import {
  createOrGetConversation,
  getContacts,
  getConversations,
  getMessages,
} from "../../../../services/DirectChatService";
import {
  getSentShares,
  shareToStudent,
} from "../../../../services/LearningPathShareService";
import { resolveShareToStudentErrorMessage } from "../../../../services/LearningPathShareService/shareErrorMessage";
import MessageStatusIcon from "../../../../components/Chat/MessageStatusIcon";
import type {
  DirectChatContactDto,
  DirectMessageDto,
  LearningPathShareCardData,
  SentLearningPathShareSummaryDto,
  ShareStatus,
} from "../../../../types/chat";
import { getMessageStatus } from "../../../../types/chat";
import { useTheme } from "../../../../contexts/ThemeContext";
import LearningPathService, {
  type SkeletonResponse,
} from "../../../../services/LearningPathService";
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
import ShareLearningPathModal from "../../../../components/Chat/ShareLearningPathModal";
import LearningPathShareCard from "../../../../components/Chat/LearningPathShareCard";
import SentShareHistoryBlock from "../../../../components/Chat/SentShareHistoryBlock";
import {
  buildLearningPathShareCardData,
  normalizeShareId,
} from "../../../../components/Chat/learningPathShare";
import {
  buildReplyDraft,
  buildReplyPreviewForMessage,
  getReplyPreviewText,
  isReplyableMessage,
  normalizeChatMessageContent,
  type ReplyDraft,
} from "../../../../components/Chat/chatReply";

type ToastState = {
  message: string;
  type: "success" | "error" | "warning" | "info";
};
type ShareOption = { id: string; label: string };
interface MentorChatPageProps {
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

function normalizeShareTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function extractSharedLearningPathTitle(content: string): string | null {
  const trimmed = content.trim();
  const patterns = [
    /^shared learning path:\s*(.+)$/i,
    /^share learning path:\s*(.+)$/i,
    /^learning path shared:\s*(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  return null;
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

const MentorChatPage: React.FC<MentorChatPageProps> = ({
  initialView = "direct",
}) => {
  const { t } = useTranslation("mentor");
  const { t: tc } = useTranslation("common");
  const { theme } = useTheme();
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: {
      conversationId?: string;
      sharePath?: { pathId: string; title?: string };
      toast?: ToastState;
    };
  };

  const {
    conversationsById,
    conversationOrder,
    messagesByConversationId,
    activeConversationId,
    setActiveConversation,
    setConversations,
    setMessages,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"direct" | "community">(
    initialView,
  );
  const [activeTab, setActiveTab] = useState<"conversations" | "contacts">(
    "conversations",
  );
  const [contacts, setContacts] = useState<DirectChatContactDto[]>([]);
  const [sharePaths, setSharePaths] = useState<ShareOption[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedPathId, setSelectedPathId] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [replyDraft, setReplyDraft] = useState<ReplyDraft | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(
    location.state?.toast ?? null,
  );
  const [sentShares, setSentShares] = useState<
    SentLearningPathShareSummaryDto[]
  >([]);
  const [allSentShares, setAllSentShares] = useState<
    SentLearningPathShareSummaryDto[]
  >([]);
  const [sentSharesLoading, setSentSharesLoading] = useState(false);
  const [sentSharesError, setSentSharesError] = useState<string | null>(null);
  const [sentShareStatus, setSentShareStatus] = useState<
    "" | Exclude<ShareStatus, "Pending">
  >("");
  const deliveredRef = useRef<Set<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());
  const messageListId = "mentor-chat-message-list";
  const messageInputRef = useRef<any>(null);

  const currentUserId = String(user?.id ?? "");
  const currentUserName = user?.name || user?.username || t("chat.title");

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

  const filteredConversations = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => {
      const name =
        (c.mentorId === currentUserId ? c.studentName : c.mentorName) ?? "";
      return name.toLowerCase().includes(q);
    });
  }, [conversations, currentUserId, searchQuery]);

  const sentShareById = useMemo(
    () =>
      new Map(
        allSentShares.map((item) => [normalizeShareId(item.shareId), item]),
      ),
    [allSentShares],
  );

  const hub = useChatHub({
    onError: (code) => {
      if (code === "UNAUTHORIZED") {
        logout();
        navigate(ROUTER.LOGIN);
      }
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
    getContacts()
      .then(setContacts)
      .catch(() => {});
    LearningPathService.getMyDrafts({
      pageNumber: 1,
      pageSize: 100,
      sortDescending: true,
    })
      .then((response) =>
        setSharePaths(
          response.items.map((item: SkeletonResponse) => ({
            id: String(item.pathId ?? item.id),
            label:
              item.title ||
              t("chat.untitledPath", {
                defaultValue: "Untitled learning path",
              }),
          })),
        ),
      )
      .catch(() => setSharePaths([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      location.state?.conversationId &&
      conversationsById[location.state.conversationId]
    ) {
      setActiveConversation(location.state.conversationId);
      return;
    }
    if (!activeConversationId && conversationOrder.length > 0) {
      setActiveConversation(conversationOrder[0]);
    }
  }, [
    activeConversationId,
    conversationOrder,
    conversationsById,
    location.state?.conversationId,
    setActiveConversation,
  ]);

  useEffect(() => {
    if (!location.state) return;
    if (location.state.toast || location.state.sharePath) {
      if (location.state.sharePath) {
        setSelectedPathId(location.state.sharePath.pathId);
        setSelectedStudentId(activeConv?.studentId ?? "");
        setIsShareModalOpen(true);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [activeConv?.studentId, location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!activeConversationId) return;
    hub.joinConversation(activeConversationId).catch(() => {});
    getMessages(activeConversationId)
      .then((res) => setMessages(activeConversationId, res?.items ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

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
      await hub.startConversation(participantId);
      setActiveTab("conversations");
      setSearchQuery("");
    } catch {}
  };

  const resolveMentorShareCardData = (
    message: DirectMessageDto,
  ): LearningPathShareCardData | null => {
    const directShareCardData = buildLearningPathShareCardData(message);
    if (directShareCardData) {
      const latestShare = sentShareById.get(
        normalizeShareId(directShareCardData.shareId),
      );
      return {
        ...directShareCardData,
        pathId: latestShare?.pathId ?? directShareCardData.pathId,
        title: latestShare?.learningPathTitle ?? directShareCardData.title,
        description:
          latestShare?.learningPathDescription ??
          directShareCardData.description,
        mentorName: directShareCardData.mentorName ?? currentUserName,
        studentName:
          latestShare?.studentName ?? directShareCardData.studentName,
        status: latestShare?.status ?? directShareCardData.status,
        sentAt: latestShare?.sentAt ?? directShareCardData.sentAt,
        respondedAt:
          latestShare?.respondedAt ?? directShareCardData.respondedAt,
      };
    }

    if (message.senderId !== currentUserId) return null;

    const sharedTitle = extractSharedLearningPathTitle(
      normalizeChatMessageContent(message.content),
    );
    if (!sharedTitle) return null;

    const normalizedTitle = normalizeShareTitle(sharedTitle);
    const titleMatches = allSentShares.filter(
      (item) => normalizeShareTitle(item.learningPathTitle) === normalizedTitle,
    );
    const fuzzyMatches = allSentShares.filter((item) => {
      const itemTitle = normalizeShareTitle(item.learningPathTitle);
      return (
        itemTitle.includes(normalizedTitle) ||
        normalizedTitle.includes(itemTitle)
      );
    });
    const candidates = titleMatches.length > 0 ? titleMatches : fuzzyMatches;
    if (candidates.length === 0) return null;

    const messageSentAt = Date.parse(message.sentAt || "");
    const bestMatch = [...candidates].sort((left, right) => {
      const leftDiff = Math.abs(Date.parse(left.sentAt || "") - messageSentAt);
      const rightDiff = Math.abs(
        Date.parse(right.sentAt || "") - messageSentAt,
      );
      return leftDiff - rightDiff;
    })[0];

    if (!bestMatch) return null;

    return {
      shareId: bestMatch.shareId,
      pathId: bestMatch.pathId,
      title: bestMatch.learningPathTitle,
      description: bestMatch.learningPathDescription,
      mentorName: currentUserName,
      studentName: bestMatch.studentName,
      status: bestMatch.status,
      sentAt: bestMatch.sentAt,
      respondedAt: bestMatch.respondedAt,
    };
  };

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
    resolveShareCardData: resolveMentorShareCardData,
  };
  const composerPlaceholder = replyDraft
    ? `${t("chat.replyingTo", { name: replyDraft.preview.senderLabel })}: ${getReplyPreviewText(replyDraft.preview)}`
    : t("chat.typePlaceholder");

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

  const openShareModal = () => {
    setShareError(null);
    setSelectedStudentId(activeConv?.studentId ?? "");
    setSelectedPathId((prev) => prev || sharePaths[0]?.id || "");
    setIsShareModalOpen(true);
  };

  const refreshSentShares = async (
    studentId?: string | null,
    status: "" | Exclude<ShareStatus, "Pending"> = sentShareStatus,
  ) => {
    if (!studentId) {
      setSentShares([]);
      setSentSharesError(null);
      return;
    }
    setSentSharesLoading(true);
    setSentSharesError(null);
    try {
      const response = await getSentShares({
        studentId,
        status: status || undefined,
      });
      setSentShares(response);
    } catch (err: any) {
      setSentSharesError(
        err?.response?.data?.message ||
          err?.message ||
          t("chat.sentSharesLoadError", {
            defaultValue: "Failed to load sent shares.",
          }),
      );
    } finally {
      setSentSharesLoading(false);
    }
  };

  const refreshAllSentShares = async (studentId?: string | null) => {
    if (!studentId) {
      setAllSentShares([]);
      return;
    }
    try {
      const response = await getSentShares({ studentId });
      setAllSentShares(response);
    } catch {
      setAllSentShares([]);
    }
  };

  const handleShare = async () => {
    if (!selectedStudentId || !selectedPathId) return;
    setSharing(true);
    setShareError(null);
    try {
      await shareToStudent(selectedPathId, selectedStudentId);
      setIsShareModalOpen(false);
      setToast({ message: t("chat.shareSuccess"), type: "success" });
      if (activeConversationId) {
        const res = await getMessages(activeConversationId);
        setMessages(activeConversationId, res.items);
      }
      if (activeConv?.studentId === selectedStudentId) {
        await refreshSentShares(selectedStudentId);
        await refreshAllSentShares(selectedStudentId);
      }
      hub.requestConversations().catch(() => {});
    } catch (err: any) {
      setShareError(resolveShareToStudentErrorMessage(err, t, t("chat.shareError")));
    } finally {
      setSharing(false);
    }
  };

  const navItems = useMentorSidebarConfig();
  const sidebarConfig = {
    navItems,
    actions: [],
    brand: { name: t("chat.title"), subtitle: "Mentor" },
  };

  const pickerTheme = theme === "dark" ? EmojiTheme.DARK : EmojiTheme.LIGHT;

  const studentContacts = contacts.filter((c) => c.roleName === "Student");
  const shareCardLabels = {
    pending: t("chat.pendingInvite", { defaultValue: "Pending" }),
    accepted: t("chat.inviteAccepted", { defaultValue: "Accepted" }),
    rejected: t("chat.inviteRejected", { defaultValue: "Rejected" }),
    accept: "",
    reject: "",
    accepting: "",
    rejecting: "",
    preview: "",
    viewPath: t("chat.viewPath", { defaultValue: "View learning path" }),
    shareFrom: (mentorName?: string | null) =>
      t("chat.shareCardFrom", {
        mentorName: mentorName || otherName || t("chat.title"),
      }),
  };

  const sentShareLabels = {
    title: t("chat.sentSharesTitle", { defaultValue: "Sent Shares" }),
    subtitle: (studentName?: string | null) =>
      t("chat.sentSharesSubtitle", {
        studentName:
          studentName ||
          otherName ||
          t("chat.student", { defaultValue: "student" }),
        defaultValue: "Learning paths already sent to {{studentName}}",
      }),
    all: t("chat.sentSharesAll", { defaultValue: "All" }),
    pending: t("chat.pendingInvite", { defaultValue: "Pending" }),
    accepted: t("chat.inviteAccepted", { defaultValue: "Accepted" }),
    rejected: t("chat.inviteRejected", { defaultValue: "Rejected" }),
    sentAt: t("chat.sentSharesSentAt", { defaultValue: "Sent" }),
    respondedAt: t("chat.sentSharesRespondedAt", { defaultValue: "Responded" }),
    waitingResponse: t("chat.sentSharesWaiting", {
      defaultValue: "Waiting for response",
    }),
    jumpToMessage: t("chat.sentSharesJump", {
      defaultValue: "Jump to share message",
    }),
    empty: t("chat.sentSharesEmpty", {
      defaultValue: "No shares found for this student.",
    }),
    loading: t("chat.sentSharesLoading", {
      defaultValue: "Loading sent shares...",
    }),
    loadError: t("chat.sentSharesLoadError", {
      defaultValue: "Failed to load sent shares.",
    }),
  };

  useEffect(() => {
    refreshSentShares(activeConv?.studentId ?? null);
    refreshAllSentShares(activeConv?.studentId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv?.studentId, sentShareStatus]);

  useEffect(() => {
    if (!activeConv?.studentId) return;

    const refreshCurrentStudentShares = () => {
      refreshSentShares(activeConv.studentId);
      refreshAllSentShares(activeConv.studentId);
    };

    const timer = window.setInterval(refreshCurrentStudentShares, 20000);
    window.addEventListener("focus", refreshCurrentStudentShares);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshCurrentStudentShares);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv?.studentId, sentShareStatus]);

  const hasShareMessage = (item: SentLearningPathShareSummaryDto) =>
    activeMessages.some(
      (message) =>
        normalizeShareId(resolveMentorShareCardData(message)?.shareId) ===
        normalizeShareId(item.shareId),
    );

  const jumpToShareMessage = (item: SentLearningPathShareSummaryDto) => {
    const target = document.querySelector(
      `[data-chat-share-id="${item.shareId}"]`,
    ) as HTMLElement | null;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

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
          <ChannelChatPage role="Mentor" sidebarNavItems={navItems} embedded />
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
                        label: t("chat.contacts", { defaultValue: "Students" }),
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
                ) : (
                  <div className="chat-kit-contact-list">
                    {studentContacts.length === 0 ? (
                      <div className="chat-kit-empty">
                        {t("chat.noStudentsYet")}
                      </div>
                    ) : (
                      studentContacts.map((contact) => (
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
                              {t("chat.student", { defaultValue: "Student" })}
                            </div>
                          </div>
                        </div>
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
                <ConversationHeader.Actions>
                  <div className="chat-kit-header-actions">
                    <button
                      title={t("chat.shareTitle")}
                      onClick={openShareModal}
                      className="chat-kit-share-btn"
                      disabled={
                        !activeConversationId || sharePaths.length === 0
                      }
                    >
                      <Share2 size={14} />
                      {t("chat.sharePathBtn")}
                    </button>
                  </div>
                </ConversationHeader.Actions>
              </ConversationHeader>

              {activeConversationId && (
                <SentShareHistoryBlock
                  items={sentShares}
                  loading={sentSharesLoading}
                  error={sentSharesError}
                  activeStudentName={activeConv?.studentName}
                  statusFilter={sentShareStatus}
                  onChangeStatus={setSentShareStatus}
                  onSelectItem={jumpToShareMessage}
                  onJumpToMessage={jumpToShareMessage}
                  hasShareMessage={hasShareMessage}
                  labels={sentShareLabels}
                />
              )}

              <MessageList
                id={messageListId}
                className="chat-kit-message-list"
                autoScrollToBottom
                scrollBehavior="smooth"
                key={`mentor-msg-${activeConversationId}-${activeMessages.length}`}
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
                    const shareCardData = resolveMentorShareCardData(msg);
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
                      <div
                        key={msg.messageId}
                        data-chat-message-id={msg.messageId}
                      >
                        <Message
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
                      </div>
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

      <ShareLearningPathModal
        isOpen={isShareModalOpen}
        title={t("chat.shareTitle")}
        studentLabel={t("chat.selectStudent")}
        pathLabel={t("chat.selectPath", {
          defaultValue: "Select learning path",
        })}
        selectStudentPlaceholder={t("chat.selectStudent")}
        selectPathPlaceholder={t("chat.selectPath", {
          defaultValue: "Select learning path",
        })}
        submitLabel={t("chat.sharePath")}
        submittingLabel={t("chat.sharing")}
        closeLabel={tc("actions.close", { defaultValue: "Close" })}
        students={studentContacts
          .filter(
            (contact) => !activeConv || contact.userId === activeConv.studentId,
          )
          .map((contact) => ({ id: contact.userId, label: contact.username }))}
        paths={sharePaths}
        selectedStudentId={selectedStudentId}
        selectedPathId={selectedPathId}
        onSelectStudent={setSelectedStudentId}
        onSelectPath={setSelectedPathId}
        onClose={() => setIsShareModalOpen(false)}
        onSubmit={handleShare}
        error={shareError}
        submitting={sharing}
        lockStudent
      />
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

export default MentorChatPage;
