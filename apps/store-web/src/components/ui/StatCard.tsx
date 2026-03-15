const colorClasses = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  green: { bg: 'bg-green-50', text: 'text-green-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600' },
} as const;

interface StatCardProps {
  label: string;
  value: string | number;
  color: keyof typeof colorClasses;
}

export function StatCard({ label, value, color }: StatCardProps) {
  const { bg, text } = colorClasses[color];
  return (
    <div className={`${bg} rounded-lg p-4`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-3xl font-bold ${text}`}>{value}</div>
    </div>
  );
}
