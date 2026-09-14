import { Link } from 'react-router-dom'

const steps = ['Target Account', 'Contacted', 'Qualified', 'Requirement', 'RFQ', 'Quotation', 'Negotiation', 'Won', 'Repeat Order']

export default function Home() {
  return (
    <div className="py-16 md:py-24">
      <div className="max-w-3xl">
        <div className="text-brand text-xs uppercase tracking-widest mb-4">Eunio Services for Steel · Direct Sales</div>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
          Build Eunio's Direct Sales Pipeline
        </h1>
        <p className="mt-6 text-lg text-steel-200 max-w-2xl">
          Find the right industrial customers, understand their requirements, manage RFQs and quotations,
          and build long-term direct customer relationships.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/accounts?discover=1" className="btn-primary">Find Target Customers</Link>
          <Link to="/pipeline" className="btn-ghost">View Pipeline</Link>
        </div>
      </div>

      <div className="mt-20 card p-6">
        <div className="label mb-3">Sales funnel</div>
        <ol className="flex flex-wrap gap-2 text-sm">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-steel-800 border border-steel-700">{s}</span>
              {i < steps.length - 1 && <span className="text-steel-600">→</span>}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-steel-400">Every account and opportunity carries a <b className="text-steel-200">next action</b>. Nothing sits idle.</p>
      </div>

      <div className="mt-8 grid md:grid-cols-3 gap-4 text-sm">
        {[
          ['Which companies buy SS pipes & coils?', 'AI-assisted discovery by industry + city, then verify and prioritise.'],
          ['What do they need?', 'Capture grade, size, thickness, finish, quantity, application per requirement.'],
          ['Did we follow up? Did they buy?', 'Stage tracking with next-action dates, won revenue, and repeat-order timing.'],
        ].map(([h, p]) => (
          <div key={h} className="card p-5">
            <div className="font-medium">{h}</div>
            <p className="mt-2 text-steel-400">{p}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
