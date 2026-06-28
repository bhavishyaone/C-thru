import { scoreAllCompanies } from '@/lib/readinessEngine'

export const dynamic = 'force-dynamic'

function displayName(domain: string): string {
  const stripped = domain.replace(/\.(com|io|co|net|org|ai|app|dev|so|xyz)$/, '')
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}

function ScoreBar({ met, total }: { met: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((met / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gray-800"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 font-mono">{met}/{total}</span>
    </div>
  )
}

export default async function AccountsPage() {
  const scores = await scoreAllCompanies()

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <nav className="text-sm text-gray-400 mb-6">
          <a href="/" className="hover:text-gray-600">Dashboard</a>
          <span className="mx-2">/</span>
          <span className="text-gray-700">Accounts</span>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <a href="/settings" className="text-sm text-gray-500 hover:text-gray-800 underline">
            Edit rules →
          </a>
        </div>

        {scores.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500 text-sm">No company data yet.</p>
            <p className="text-gray-400 text-xs mt-1">
              Events with company email domains will appear here once they&apos;re ingested.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-6 py-3">Company</th>
                  <th className="text-left px-6 py-3">Readiness</th>
                  <th className="text-left px-6 py-3">Domain</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {scores.map((s, i) => (
                  <tr key={s.domain} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i === scores.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {displayName(s.domain)}
                    </td>
                    <td className="px-6 py-4">
                      <ScoreBar met={s.rulesMet} total={s.rulesTotal} />
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-400 text-xs">
                      {s.domain}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={`/accounts/${s.domain}`}
                        className="text-xs text-gray-400 hover:text-gray-700 underline"
                      >
                        Details →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4">
          Scores computed live from your data. {scores.length} {scores.length === 1 ? 'company' : 'companies'} found.
        </p>
      </div>
    </main>
  )
}
