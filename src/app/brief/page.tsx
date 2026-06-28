import { collectBriefFacts, generateBriefSentence } from '@/lib/briefGenerator'

export const dynamic = 'force-dynamic'

export default async function BriefPage() {
  const facts = await collectBriefFacts()
  const brief = generateBriefSentence(facts)

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <nav className="text-sm text-gray-400 mb-6">
          <a href="/" className="hover:text-gray-600">Dashboard</a>
          <span className="mx-2">/</span>
          <span className="text-gray-700">Morning Brief</span>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Morning Brief</h1>

        {/* Brief sentence */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <p className="text-base text-gray-800 leading-relaxed">{brief}</p>
          <p className="text-xs text-gray-400 mt-3">
            Generated {new Date(facts.generatedAt).toLocaleString()} · No AI involved — deterministic template.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{facts.activeUsers7d}</p>
            <p className="text-xs text-gray-400 mt-1">Active users (7d)</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{facts.activeUsers30d}</p>
            <p className="text-xs text-gray-400 mt-1">Active users (30d)</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{facts.newSignups7d}</p>
            <p className="text-xs text-gray-400 mt-1">New signups (7d)</p>
          </div>
        </div>

        {/* Top users */}
        {facts.topUsers.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Most active this week
            </h2>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                    <th className="text-left px-4 py-2">User</th>
                    <th className="text-right px-4 py-2">Events</th>
                  </tr>
                </thead>
                <tbody>
                  {facts.topUsers.map((u, i) => (
                    <tr key={u.userId} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-gray-800">
                        {u.email ?? <span className="font-mono text-gray-400">{u.userId}</span>}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">{u.eventCount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Top account */}
        {facts.topCompany && facts.topCompanyScore && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Top account
            </h2>
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{facts.topCompany}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {facts.topCompanyScore.rulesMet}/{facts.topCompanyScore.rulesTotal} readiness rules met
                </p>
              </div>
              <a
                href={`/accounts/${facts.topCompany}`}
                className="text-xs text-gray-400 hover:text-gray-700 underline"
              >
                Details →
              </a>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
