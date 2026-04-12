import re

with open("src/pages/private/Mentor/index.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. We will extract Quick Actions block
quick_actions_match = re.search(r'(        {/\* ========== QUICK ACTIONS ========== \*/}\n        <div className="bg-th-card border border-bd-strong">.*?</div>\n        </div>)', text, re.DOTALL)
quick_actions_code = quick_actions_match.group(1).replace('<div className="bg-th-card border border-bd-strong">', '<div className="bg-th-card border border-bd-strong mb-6">')

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
"""

pattern = r'        {/\* ========== MAIN CONTENT SECTIONS ========== \*/}.*?        {/\* ========== QUICK ACTIONS ========== \*/}\n        <div className="bg-th-card border border-bd-strong">\n          <div className="p-4 border-b border-bd bg-th-page flex items-center gap-3">\n            <span className="text-status-blue font-bold flex"><Zap size={18} /></span>\n            <h2 className="text-sm font-bold text-heading uppercase">\{t\(\'dashboard\.quickActions\'\)\}</h2>\n          </div>\n          \n          <div className="p-4">\n            <div className="flex flex-wrap gap-4">\n              <button className="px-6 py-2 border border-blue-600 bg-status-blue-solid text-white font-bold hover:bg-status-blue-solid-hover transition-colors rounded-sm shadow-sm flex items-center gap-2">\n                \{t\(\'dashboard\.buildCourse\'\)\}\n              </button>\n              <button className="px-6 py-2 border border-blue-600 text-status-blue bg-th-card font-bold hover:bg-status-blue-bg transition-colors rounded-sm shadow-sm flex items-center gap-2">\n                \{t\(\'dashboard\.viewStudents\'\)\}\n              </button>\n              <button className="px-6 py-2 border border-blue-600 text-status-blue bg-th-card font-bold hover:bg-status-blue-bg transition-colors rounded-sm shadow-sm flex items-center gap-2" onClick=\{openSubjectModal\}>\n                \{t\(\'dashboard\.addSubject\'\)\}\n              </button>\n            </div>\n          </div>\n        </div>'

# Let's extract RECENT MESSAGES
msg_match = re.search(r'(          {/\* RECENT MESSAGES \*/}.*?          </div>)', text, re.DOTALL)
# And RECENT DRAFTS
drafts_match = re.search(r'(          <div className="bg-th-card border border-bd-strong">\n            <div className="p-4 border-b border-bd bg-th-page flex items-center gap-3">\n              <span className="text-status-blue font-bold flex"><Folder size={18} /></span>\n              <div>\n                <h2 className="text-sm font-bold text-heading uppercase">\{t\(\'dashboard\.recentDrafts\', \'Recent Drafts\'\)\}</h2>.*?          </div>)', text, re.DOTALL)

# Reconstruct
replacement = new_layout + msg_match.group(1) + "\n\n          {/* RECENT DRAFTS */}\n" + drafts_match.group(1) + "\n        </div>"

text = re.sub(pattern, replacement, text, flags=re.DOTALL)

with open("src/pages/private/Mentor/index.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("success")
