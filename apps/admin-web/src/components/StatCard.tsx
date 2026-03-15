interface StatCardProps {
  label: string;
  value: string | number;
  colorClass?: string;
}

export default function StatCard({ label, value, colorClass = 'text-blue-600' }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border p-5">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
    </div>
  );
}
