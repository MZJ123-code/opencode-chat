import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { fetchDailyStats, fetchFeedbackDetail, fetchVisitsDetail, fetchQuestionsDetail, recordVisit } from '../../api/stats'
import type { BasicStats, DailyStatsItem, FeedbackDetailItem, VisitDetailItem, QuestionDetailItem } from '../../types/api-responses'
import { ThemeToggle } from '../common/ThemeToggle'
import type { FilterValues } from './DashboardFilters'
import { DashboardFilters } from './DashboardFilters'
import { DashboardCharts } from './DashboardCharts'
import { ContentModal } from './ContentModal'

interface DashboardPageProps {
  onBack: () => void
}

const defaultFilters: FilterValues = {
  dateFrom: '',
  dateTo: '',
  agents: [],
  satisfaction: 'all',
  ipSearch: '',
}

export function DashboardPage({ onBack }: DashboardPageProps) {
  const [basic, setBasic] = useState<BasicStats | null>(null)
  const [daily, setDaily] = useState<DailyStatsItem[]>([])
  const [feedback, setFeedback] = useState<FeedbackDetailItem[]>([])
  const [visits, setVisits] = useState<VisitDetailItem[]>([])
  const [questions, setQuestions] = useState<QuestionDetailItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterValues>(defaultFilters)
  const [modal, setModal] = useState<{ title: string; content: string } | null>(null)

  // 赞踩明细排序+筛选
  const [fbSortKey, setFbSortKey] = useState('created_at')
  const [fbSortDir, setFbSortDir] = useState<'asc' | 'desc'>('desc')
  const [fbFilters, setFbFilters] = useState<Record<string, string>>({})

  // 每日统计排序+筛选
  const [dailySortKey, setDailySortKey] = useState('date')
  const [dailySortDir, setDailySortDir] = useState<'asc' | 'desc'>('desc')
  const [dailyFilters, setDailyFilters] = useState<Record<string, string>>({})

  // 访问明细排序+筛选
  const [visitSortKey, setVisitSortKey] = useState('visited_at')
  const [visitSortDir, setVisitSortDir] = useState<'asc' | 'desc'>('desc')
  const [visitFilters, setVisitFilters] = useState<Record<string, string>>({})

  // 提问明细排序+筛选
  const [qSortKey, setQSortKey] = useState('asked_at')
  const [qSortDir, setQSortDir] = useState<'asc' | 'desc'>('desc')
  const [qFilters, setQFilters] = useState<Record<string, string>>({})

  useEffect(() => {
    recordVisit()
    loadData()
  }, [])

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetchDailyStats(90),
      fetchFeedbackDetail(9999),
      fetchVisitsDetail(9999),
      fetchQuestionsDetail(9999),
    ]).then(([dailyRes, feedbackRes, visitsRes, questionsRes]) => {
      setBasic(dailyRes.basic)
      setDaily(dailyRes.daily)
      setFeedback(feedbackRes)
      setVisits(visitsRes)
      setQuestions(questionsRes)
    }).catch(() => {
    }).finally(() => setLoading(false))
  }, [])

  const handleRefresh = useCallback(() => loadData(), [loadData])

  const availableAgents = useMemo(() => {
    const set = new Set<string>()
    for (const q of questions) { if (q.agent) set.add(q.agent) }
    return Array.from(set).sort()
  }, [questions])

  const makeSorter = (sortKey: string) => (a: any, b: any) => {
    let va: string | number = a[sortKey] ?? ''
    let vb: string | number = b[sortKey] ?? ''
    if (typeof va === 'string') va = va.toLowerCase()
    if (typeof vb === 'string') vb = vb.toLowerCase()
    return va < vb ? -1 : va > vb ? 1 : 0
  }

  const makeTextFilter = (items: any[], colFilters: Record<string, string>, colMap?: Record<string, (item: any) => string>) => {
    for (const [key, val] of Object.entries(colFilters)) {
      if (!val) continue
      const lower = val.toLowerCase()
      const mapper = colMap?.[key]
      items = items.filter(item => (mapper ? mapper(item) : String(item[key] ?? '')).toLowerCase().includes(lower))
    }
    return items
  }

  const filteredDaily = useMemo(() => {
    let items = daily
    if (filters.dateFrom) items = items.filter(d => d.date >= filters.dateFrom)
    if (filters.dateTo) items = items.filter(d => d.date <= filters.dateTo)
    items = makeTextFilter(items, dailyFilters)
    items.sort(makeSorter(dailySortKey))
    if (dailySortDir === 'desc') items.reverse()
    return items
  }, [daily, filters.dateFrom, filters.dateTo, dailyFilters, dailySortKey, dailySortDir])

  const filteredVisits = useMemo(() => {
    let items = visits
    if (filters.dateFrom) items = items.filter(v => v.visit_date >= filters.dateFrom)
    if (filters.dateTo) items = items.filter(v => v.visit_date <= filters.dateTo)
    if (filters.ipSearch) items = items.filter(v => v.ip.includes(filters.ipSearch))
    items = makeTextFilter(items, visitFilters)
    items.sort(makeSorter(visitSortKey))
    if (visitSortDir === 'desc') items.reverse()
    return items
  }, [visits, filters.dateFrom, filters.dateTo, filters.ipSearch, visitFilters, visitSortKey, visitSortDir])

  const filteredQuestions = useMemo(() => {
    let items = questions
    if (filters.dateFrom) items = items.filter(q => q.question_date >= filters.dateFrom)
    if (filters.dateTo) items = items.filter(q => q.question_date <= filters.dateTo)
    if (filters.agents.length > 0) items = items.filter(q => filters.agents.includes(q.agent))
    if (filters.ipSearch) items = items.filter(q => q.ip.includes(filters.ipSearch))
    items = makeTextFilter(items, qFilters)
    items.sort(makeSorter(qSortKey))
    if (qSortDir === 'desc') items.reverse()
    return items
  }, [questions, filters.dateFrom, filters.dateTo, filters.agents, filters.ipSearch, qFilters, qSortKey, qSortDir])

  const filteredFeedback = useMemo(() => {
    let items = feedback
    if (filters.dateFrom) items = items.filter(f => f.created_at?.slice(0, 10) >= filters.dateFrom)
    if (filters.dateTo) items = items.filter(f => f.created_at?.slice(0, 10) <= filters.dateTo)
    if (filters.satisfaction === 'liked') items = items.filter(f => f.satisfied)
    if (filters.satisfaction === 'disliked') items = items.filter(f => !f.satisfied)
    if (filters.ipSearch) items = items.filter(f => f.ip.includes(filters.ipSearch))
    items = makeTextFilter(items, fbFilters, {
      satisfied: f => f.satisfied ? '赞' : '踩',
    })
    items.sort((a, b) => {
      let va: string | number = (a as any)[fbSortKey] ?? ''
      let vb: string | number = (b as any)[fbSortKey] ?? ''
      if (fbSortKey === 'satisfied') { va = va ? 1 : 0; vb = vb ? 1 : 0 }
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      return va < vb ? -1 : va > vb ? 1 : 0
    })
    if (fbSortDir === 'desc') items.reverse()
    return items
  }, [feedback, filters, fbFilters, fbSortKey, fbSortDir])

  const makeSortHandler = (setKey: (k: string) => void, setDir: (d: 'asc'|'desc') => void, getKey: string, getDir: 'asc'|'desc') =>
    (key: string) => {
      if (getKey === key) setDir(getDir === 'asc' ? 'desc' : 'asc')
      else { setKey(key); setDir('asc') }
    }

  const handleFbSort = useMemo(() => makeSortHandler(setFbSortKey, setFbSortDir, fbSortKey, fbSortDir), [fbSortKey, fbSortDir])
  const handleDailySort = useMemo(() => makeSortHandler(setDailySortKey, setDailySortDir, dailySortKey, dailySortDir), [dailySortKey, dailySortDir])
  const handleVisitSort = useMemo(() => makeSortHandler(setVisitSortKey, setVisitSortDir, visitSortKey, visitSortDir), [visitSortKey, visitSortDir])
  const handleQSort = useMemo(() => makeSortHandler(setQSortKey, setQSortDir, qSortKey, qSortDir), [qSortKey, qSortDir])

  if (loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0" style={{ background: 'var(--bg)' }}>
        <Header onBack={onBack} onRefresh={handleRefresh} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[var(--text-secondary)] text-sm">加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: 'var(--bg)' }}>
      <Header onBack={onBack} onRefresh={handleRefresh} />

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {basic && <SummaryCards basic={basic} />}

        <DashboardFilters filters={filters} onChange={setFilters} availableAgents={availableAgents} />

        <DashboardCharts questions={filteredQuestions} feedback={filteredFeedback} />

        {/* 每日统计 */}
        <section>
          <SectionTitle title={`每日统计 (${filteredDaily.length} 天)`} />
          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs min-w-[500px]" style={{ background: 'var(--chat-bg)' }}>
              <thead>
                <tr className="text-[var(--text-secondary)]" style={{ background: 'var(--secondary)' }}>
                  <ColHeader label="日期" colKey="date" sortKey={dailySortKey} sortDir={dailySortDir} onSort={handleDailySort} columnFilters={dailyFilters} setColumnFilters={setDailyFilters} />
                  <ColHeader label="访问次数" colKey="visits" sortKey={dailySortKey} sortDir={dailySortDir} onSort={handleDailySort} columnFilters={dailyFilters} setColumnFilters={setDailyFilters} right />
                  <ColHeader label="访客数" colKey="visitors" sortKey={dailySortKey} sortDir={dailySortDir} onSort={handleDailySort} columnFilters={dailyFilters} setColumnFilters={setDailyFilters} right />
                  <ColHeader label="提问数" colKey="questions" sortKey={dailySortKey} sortDir={dailySortDir} onSort={handleDailySort} columnFilters={dailyFilters} setColumnFilters={setDailyFilters} right />
                  <ColHeader label="点赞" colKey="likes" sortKey={dailySortKey} sortDir={dailySortDir} onSort={handleDailySort} columnFilters={dailyFilters} setColumnFilters={setDailyFilters} right />
                  <ColHeader label="点踩" colKey="dislikes" sortKey={dailySortKey} sortDir={dailySortDir} onSort={handleDailySort} columnFilters={dailyFilters} setColumnFilters={setDailyFilters} right />
                </tr>
              </thead>
              <tbody>
                {filteredDaily.map(row => (
                  <tr key={row.date} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-2.5 text-[var(--text)] whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text)] whitespace-nowrap">{row.visits}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text)] whitespace-nowrap">{row.visitors}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text)] whitespace-nowrap">{row.questions}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap" style={{ color: '#22c55e' }}>{row.likes}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap" style={{ color: '#ef4444' }}>{row.dislikes}</td>
                  </tr>
                ))}
                {filteredDaily.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-[var(--text-secondary)]">暂无数据</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* 访问明细 */}
        <section>
          <SectionTitle title={`访问明细 (${filteredVisits.length} 条)`} />
          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs min-w-[500px]" style={{ background: 'var(--chat-bg)' }}>
              <thead>
                <tr className="text-[var(--text-secondary)]" style={{ background: 'var(--secondary)' }}>
                  <ColHeader label="时间" colKey="visited_at" sortKey={visitSortKey} sortDir={visitSortDir} onSort={handleVisitSort} columnFilters={visitFilters} setColumnFilters={setVisitFilters} />
                  <ColHeader label="IP" colKey="ip" sortKey={visitSortKey} sortDir={visitSortDir} onSort={handleVisitSort} columnFilters={visitFilters} setColumnFilters={setVisitFilters} />
                  <ColHeader label="User-Agent" colKey="user_agent" sortKey={visitSortKey} sortDir={visitSortDir} onSort={handleVisitSort} columnFilters={visitFilters} setColumnFilters={setVisitFilters} />
                  <ColHeader label="访问日期" colKey="visit_date" sortKey={visitSortKey} sortDir={visitSortDir} onSort={handleVisitSort} columnFilters={visitFilters} setColumnFilters={setVisitFilters} />
                </tr>
              </thead>
              <tbody>
                {filteredVisits.map(row => (
                  <tr key={row.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)] whitespace-nowrap">{row.visited_at}</td>
                    <td className="px-4 py-2.5 text-[var(--text)] font-mono whitespace-nowrap">{row.ip}</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)] max-w-xs truncate" title={row.user_agent}>{row.user_agent || '-'}</td>
                    <td className="px-4 py-2.5 text-[var(--text)] whitespace-nowrap">{row.visit_date}</td>
                  </tr>
                ))}
                {filteredVisits.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-[var(--text-secondary)]">暂无数据</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* 提问明细 */}
        <section>
          <SectionTitle title={`提问明细 (${filteredQuestions.length} 条)`} />
          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs min-w-[550px]" style={{ background: 'var(--chat-bg)' }}>
              <thead>
                <tr className="text-[var(--text-secondary)]" style={{ background: 'var(--secondary)' }}>
                  <ColHeader label="时间" colKey="asked_at" sortKey={qSortKey} sortDir={qSortDir} onSort={handleQSort} columnFilters={qFilters} setColumnFilters={setQFilters} />
                  <ColHeader label="IP" colKey="ip" sortKey={qSortKey} sortDir={qSortDir} onSort={handleQSort} columnFilters={qFilters} setColumnFilters={setQFilters} />
                  <ColHeader label="Agent" colKey="agent" sortKey={qSortKey} sortDir={qSortDir} onSort={handleQSort} columnFilters={qFilters} setColumnFilters={setQFilters} />
                  <ColHeader label="问题内容" colKey="content" sortKey={qSortKey} sortDir={qSortDir} onSort={handleQSort} columnFilters={qFilters} setColumnFilters={setQFilters} />
                  <ColHeader label="会话 ID" colKey="session_id" sortKey={qSortKey} sortDir={qSortDir} onSort={handleQSort} columnFilters={qFilters} setColumnFilters={setQFilters} />
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map(row => (
                  <tr key={row.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)] whitespace-nowrap">{row.asked_at}</td>
                    <td className="px-4 py-2.5 text-[var(--text)] font-mono whitespace-nowrap">{row.ip}</td>
                    <td className="px-4 py-2.5 text-[var(--text)] whitespace-nowrap">{row.agent || '-'}</td>
                    <td className="px-4 py-2.5 text-[var(--text)] max-w-xs truncate" title={row.content}>{row.content || '-'}</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)] font-mono text-xs max-w-[120px] truncate" title={row.session_id}>{row.session_id}</td>
                  </tr>
                ))}
                {filteredQuestions.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-[var(--text-secondary)]">暂无数据</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* 赞踩明细 */}
        <section>
          <SectionTitle title={`赞踩明细 (${filteredFeedback.length} 条)`} />
          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-xs min-w-[550px]" style={{ background: 'var(--chat-bg)' }}>
              <thead>
                <tr className="text-[var(--text-secondary)]" style={{ background: 'var(--secondary)' }}>
                  <ColHeader label="时间" colKey="created_at" sortKey={fbSortKey} sortDir={fbSortDir} onSort={handleFbSort} columnFilters={fbFilters} setColumnFilters={setFbFilters} />
                  <ColHeader label="IP" colKey="ip" sortKey={fbSortKey} sortDir={fbSortDir} onSort={handleFbSort} columnFilters={fbFilters} setColumnFilters={setFbFilters} />
                  <ColHeader label="类型" colKey="satisfied" sortKey={fbSortKey} sortDir={fbSortDir} onSort={handleFbSort} columnFilters={fbFilters} setColumnFilters={setFbFilters} center />
                  <ColHeader label="问题内容" colKey="question_content" sortKey={fbSortKey} sortDir={fbSortDir} onSort={handleFbSort} columnFilters={fbFilters} setColumnFilters={setFbFilters} />
                  <ColHeader label="AI 回答" colKey="answer_content" sortKey={fbSortKey} sortDir={fbSortDir} onSort={handleFbSort} columnFilters={fbFilters} setColumnFilters={setFbFilters} />
                </tr>
              </thead>
              <tbody>
                {filteredFeedback.map(row => (
                  <tr key={row.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)] whitespace-nowrap">{row.created_at}</td>
                    <td className="px-4 py-2.5 text-[var(--text)] font-mono whitespace-nowrap">{row.ip}</td>
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      <span className="text-xs font-medium" style={{ color: row.satisfied ? '#22c55e' : '#ef4444' }}>{row.satisfied ? '赞' : '踩'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text)] max-w-xs align-middle">
                      {row.question_content ? <ContentView text={row.question_content} label="问题内容" onView={(t, c) => setModal({ title: t, content: c })} /> : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)] max-w-xs align-middle">
                      {row.answer_content ? <ContentView text={row.answer_content} label="AI 回答" onView={(t, c) => setModal({ title: t, content: c })} /> : '-'}
                    </td>
                  </tr>
                ))}
                {filteredFeedback.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-[var(--text-secondary)]">暂无数据</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <ContentModal open={!!modal} onClose={() => setModal(null)} title={modal?.title || ''} content={modal?.content || ''} />
    </div>
  )
}

function Header({ onBack, onRefresh }: { onBack: () => void; onRefresh: () => void }) {
  return (
    <div className="flex items-center px-4 h-14 shrink-0 gap-2 border-b border-[var(--border)]" style={{ background: 'var(--chat-bg)' }}>
      <motion.button onClick={onBack} className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--text)] transition-colors shrink-0 bg-transparent border-0 cursor-pointer" whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
        <span className="text-base leading-none">←</span>
        <span className="hidden sm:inline">返回聊天</span>
      </motion.button>
      <span className="text-sm font-medium text-[var(--text)] flex-1">数据看板</span>
      <motion.button onClick={onRefresh} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] bg-transparent cursor-pointer shrink-0 text-xs text-[var(--text-secondary)] hover:bg-[var(--accent)] transition-colors" whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} title="刷新数据">↻</motion.button>
      <ThemeToggle className="text-[var(--muted-foreground)] hover:text-[var(--text)] border-[var(--border)]" />
    </div>
  )
}

function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
      {action}
    </div>
  )
}

function ColHeader({ label, colKey, sortKey, sortDir, onSort, columnFilters, setColumnFilters, center, right }: {
  label: string; colKey: string; sortKey: string; sortDir: 'asc' | 'desc'; onSort: (k: string) => void
  columnFilters: Record<string, string>; setColumnFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>
  center?: boolean; right?: boolean
}) {
  const isSorted = sortKey === colKey
  const filterVal = columnFilters[colKey] || ''

  return (
    <th className={`${center ? 'text-center' : right ? 'text-right' : 'text-left'} px-3 py-2 font-medium whitespace-nowrap select-none align-top`} style={{ background: 'var(--secondary)' }}>
      <button onClick={() => onSort(colKey)} className="inline-flex items-center gap-1 bg-transparent border-0 cursor-pointer text-inherit text-xs font-medium hover:text-[var(--text)] transition-colors px-0 py-0.5">
        {label}
        <span className="text-[var(--muted-foreground)]" style={{ color: isSorted ? 'var(--accent)' : undefined }}>
          {isSorted ? (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} />}
        </span>
      </button>

      <div className="mt-1">
        {colKey === 'satisfied' ? (
          <div className="flex gap-1">
            {(['赞', '踩'] as const).map(opt => {
              const active = filterVal === opt
              return (
                <button key={opt} onClick={() => {
                  if (active) setColumnFilters(prev => { const n = { ...prev }; delete n[colKey]; return n })
                  else setColumnFilters(prev => ({ ...prev, [colKey]: opt }))
                }}
                  className="flex-1 px-2 py-1 text-[11px] font-medium rounded-md border bg-transparent cursor-pointer transition-all"
                  style={{
                    borderColor: active ? (opt === '赞' ? '#22c55e' : '#ef4444') : 'var(--border)',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    background: active ? (opt === '赞' ? '#22c55e' : '#ef4444') : 'transparent',
                  }}
                >{opt}</button>
              )
            })}
          </div>
        ) : (
          <input type="text" placeholder="筛选..." value={filterVal}
            onChange={e => setColumnFilters(prev => ({ ...prev, [colKey]: e.target.value }))}
            className="w-full min-w-[70px] px-2 py-1 text-[11px] rounded-md border bg-transparent text-[var(--text)] outline-none placeholder:text-[var(--muted-foreground)] transition-colors"
            style={{ borderColor: filterVal ? 'var(--accent)' : 'var(--border)' }}
          />
        )}
      </div>
    </th>
  )
}

function ContentView({ text, label, onView }: { text: string; label: string; onView: (title: string, content: string) => void }) {
  const long = text.length > 150
  return (
    <div>
      <div className="line-clamp-3" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} title={text}>{text}</div>
      {long && <button onClick={() => onView(label, text)} className="mt-0.5 text-[var(--muted-foreground)] hover:text-[var(--text)] bg-transparent border-0 cursor-pointer text-xs underline">查看详情</button>}
    </div>
  )
}

function SummaryCards({ basic }: { basic: BasicStats }) {
  const cards = [
    { label: '总访客数', value: basic.visitors, color: '#6366f1' },
    { label: '总提问数', value: basic.totalQuestions, color: '#8b5cf6' },
    { label: '今日访问', value: basic.todayVisits, color: '#06b6d4' },
    { label: '今日提问', value: basic.todayQuestions, color: '#22c55e' },
    { label: '反馈总数', value: basic.totalFeedback, color: '#f59e0b' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(card => (
        <motion.div key={card.label} className="rounded-xl p-4 flex flex-col gap-1" style={{ background: 'var(--chat-bg)', border: '1px solid var(--border)' }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
          <span className="text-xs text-[var(--text-secondary)]">{card.label}</span>
          <span className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</span>
        </motion.div>
      ))}
    </div>
  )
}
