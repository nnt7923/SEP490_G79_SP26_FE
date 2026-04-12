with open("src/pages/private/Mentor/index.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_layout = """        {/* ========== QUICK ACTIONS ========== */}
        <div className="bg-th-card border border-bd-strong mb-6">
          <div className="p-4 border-b border-bd bg-th-page flex items-center gap-3">
            <span className="text-status-blue font-bold flex"><Zap size={18} /></span>
            <h2 className="text-sm font-bold text-heading uppercase">{t('dashboard.quickActions')}</h2>
          </div>
          
          <div className="p-4">
            <div className="flex flex-wrap gap-4">
              <button className="px-6 py-2 border border-blue-600 bg-status-blue-solid text-white font-bold hover:bg-status-blue-solid-hover transition-colors rounded-sm shadow-sm flex items-center gap-2">
                {t('dashboard.buildCourse')}
              </button>
              <button className="px-6 py-2 border border-blue-600 text-status-blue bg-th-card font-bold hover:bg-status-blue-bg transition-colors rounded-sm shadow-sm flex items-center gap-2">
                {t('dashboard.viewStudents')}
              </button>
              <button className="px-6 py-2 border border-blue-600 text-status-blue bg-th-card font-bold hover:bg-status-blue-bg transition-colors rounded-sm shadow-sm flex items-center gap-2" onClick={openSubjectModal}>
                {t('dashboard.addSubject')}
              </button>
            </div>
          </div>
        </div>

        {/* ========== MAIN CONTENT SECTIONS ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* RECENT MESSAGES */}
          <div className="bg-th-card border border-bd-strong">
            <div className="p-4 border-b border-bd bg-th-page flex items-center gap-3">
              <span className="text-status-blue font-bold flex"><LayoutDashboard size={18} /></span>
              <div>
                <h2 className="text-sm font-bold text-heading uppercase">{t('dashboard.recentMessages', 'Recent Messages')}</h2>
                <p className="text-xs text-muted">{t('dashboard.latestFromStudents', 'Latest messages from students')}</p>
              </div>
            </div>
            
            <div className="p-4">
              {loadingOverview ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm font-bold text-muted">{t('dashboard.loadingData', 'Loading...')}</span>
                </div>
              ) : recentMessages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-heading font-bold text-lg mb-1">{t('dashboard.noMessagesFound', 'No messages')}</p>
                  <p className="text-xs text-muted">{t('dashboard.messagesWillAppear', 'Incoming messages will appear here')}</p>
                </div>
              ) : (
                <div className="space-y-0 divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
                  {recentMessages.map((msg, i) => {
                    const initials = getInitials(msg.studentName || 'Student')
                    const dateStr = msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(msg.sentAt).toLocaleDateString() : ''
                    return (
                      <motion.div
                        key={msg.messageId || i}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        className="flex items-center gap-4 py-3 hover:bg-th-page transition-colors"
                      >
                        <div className="w-10 h-10 bg-th-card border border-bd-strong flex items-center justify-center flex-shrink-0">
                          <span className="text-heading font-bold text-sm">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-heading text-sm truncate">{msg.studentName}</p>
                          <p className="text-xs text-muted truncate">{msg.content}</p>
                        </div>
                        {dateStr && (
                          <div className="text-[10px] text-muted whitespace-nowrap self-start mt-1">
                            {dateStr}
                          </div>
                        )}
                        <button className="px-3 py-1 border border-bd-strong text-xs font-bold hover:bg-th-input transition-colors rounded-sm ml-2">
                          {t('dashboard.reply', 'Reply')}
                        </button>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RECENT DRAFTS */}
          <div className="bg-th-card border border-bd-strong">
            <div className="p-4 border-b border-bd bg-th-page flex items-center gap-3">
              <span className="text-status-blue font-bold flex"><Folder size={18} /></span>
              <div>
                <h2 className="text-sm font-bold text-heading uppercase">{t('dashboard.recentDrafts', 'Recent Drafts')}</h2>
                <p className="text-xs text-muted">{t('dashboard.recentDraftsSub', 'Recently created or updated learning paths')}</p>
              </div>
            </div>
            
            <div className="p-4">
              {loadingDrafts ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm font-bold text-muted">{t('dashboard.loadingData', 'Loading...')}</span>
                </div>
              ) : recentDrafts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-heading font-bold text-lg mb-1">{t('dashboard.noDraftsYet', 'No drafts found')}</p>
                  <p className="text-xs text-muted">{t('dashboard.createDraftToSee', 'Create a new draft learning path to see it here')}</p>
                </div>
              ) : (
                <div className="space-y-0 divide-y divide-gray-200">
                  {recentDrafts.map((draft, i) => {
                    const dateStr = draft.createdAt ? new Date(draft.createdAt).toLocaleDateString() : ''
                    return (
                      <div key={draft.pathId || i} className="flex items-center gap-4 py-3 hover:bg-th-page transition-colors px-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-heading text-sm truncate">{draft.title || t('dashboard.untitledDraft', 'Untitled Draft')}</p>
                          <p className="text-xs text-muted truncate">{draft.description || '—'}</p>
                        </div>
                        <div className="text-xs text-muted whitespace-nowrap hidden sm:block">
                          ver {draft.version || 1}
                        </div>
                        {dateStr && (
                          <div className="text-[10px] text-muted whitespace-nowrap">
                            {dateStr}
                          </div>
                        )}
                        <button 
                          className="px-3 py-1 border border-bd-strong text-xs font-bold hover:bg-th-input transition-colors rounded-sm ml-2 cursor-pointer"
                          onClick={() => window.location.href = `/mentor/drafts/${draft.pathId}`}
                        >
                          {t('dashboard.open', 'Open')}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
"""

# I want to replace lines 190 to 384. (0-indexed 189 to 384)
# That's exactly len(lines) up to index 189 + my new stuff + index 384 onward.
final_lines = lines[:189] + [new_layout] + lines[384:]

with open("src/pages/private/Mentor/index.tsx", "w", encoding="utf-8") as f:
    f.writelines(final_lines)

print("Replaced chunk exactly by index.")
