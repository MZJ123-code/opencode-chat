import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { QuestionDetailItem, FeedbackDetailItem } from '../../types/api-responses'

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444']

interface DashboardChartsProps {
  questions: QuestionDetailItem[]
  feedback: FeedbackDetailItem[]
}

export function DashboardCharts({ questions, feedback }: DashboardChartsProps) {
  const agentData = useMemo(() => {
    const map = new Map<string, number>()
    for (const q of questions) {
      const agent = q.agent || '未知'
      map.set(agent, (map.get(agent) || 0) + 1)
    }
    return Array.from(map.entries()).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
  }, [questions])

  const satisfactionData = useMemo(() => {
    let likes = 0, dislikes = 0
    for (const f of feedback) {
      if (f.satisfied) likes++
      else dislikes++
    }
    return [
      { name: '👍 赞', value: likes, color: '#22c55e' },
      { name: '👎 踩', value: dislikes, color: '#ef4444' },
    ].filter(d => d.value > 0)
  }, [feedback])

  const hasData = agentData.length > 0 || satisfactionData.length > 0
  if (!hasData) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {agentData.length > 0 && (
        <ChartCard title="Agent 使用分布">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={agentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                {agentData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--chat-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--text)',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }}
                formatter={(value) => (
                  <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {satisfactionData.length > 0 && (
        <ChartCard title="反馈满意度">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={satisfactionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                {satisfactionData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--chat-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--text)',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }}
                formatter={(value) => (
                  <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: 'var(--chat-bg)', borderColor: 'var(--border)' }}
    >
      <h3 className="text-xs font-semibold text-[var(--text)] mb-3">{title}</h3>
      {children}
    </div>
  )
}
