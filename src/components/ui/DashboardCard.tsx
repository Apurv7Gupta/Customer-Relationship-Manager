export const DashboardCard: React.FC<{
  title: string;
  value: string | number;
  trend: string;
  trendUp: boolean;
  description: string;
}> = ({ title, value, trend, trendUp, description }) => (
  <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
    <div className="mb-2 text-lg font-medium text-gray-800">{title}</div>
    <div className="flex items-end justify-between">
      <div className="text-5xl font-bold text-gray-900">{value}</div>
      <div
        className={`flex items-center text-sm font-medium ${
          trendUp ? "text-gray-500" : "text-red-500"
        }`}
      >
        {trendUp ? "↗" : "↘"} {trend}
      </div>
    </div>
    <p className="mt-4 text-sm text-gray-500">{description}</p>
  </div>
);
