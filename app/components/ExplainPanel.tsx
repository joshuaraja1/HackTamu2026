'use client';

interface ExplainPanelProps {
  debug: {
    stage_counts: Record<string, number>;
    top_signals: string[];
    final_stage: string;
  };
}

export default function ExplainPanel({ debug }: ExplainPanelProps) {
  return (
    <div className="bg-gray-100 border rounded-lg p-4 text-sm">
      <h4 className="font-semibold mb-2">Debug Info</h4>
      <div className="space-y-2">
        <div>
          <strong>Stage Counts:</strong>
          <pre className="mt-1 bg-white p-2 rounded overflow-auto">
            {JSON.stringify(debug.stage_counts, null, 2)}
          </pre>
        </div>
        <div>
          <strong>Top Signals:</strong> {debug.top_signals.join(', ')}
        </div>
        <div>
          <strong>Final Stage:</strong> {debug.final_stage}
        </div>
      </div>
    </div>
  );
}

