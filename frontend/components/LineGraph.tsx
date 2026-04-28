"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import { GraphData } from "@/lib/api";

interface LineGraphProps {
  data: GraphData;
}

export default function LineGraph({ data }: LineGraphProps) {
  const priorMonths = data.x_axis.slice(0, data.prior_month_cutoff);
  const currentMonths = data.x_axis.slice(data.prior_month_cutoff);

  const priorData = data.data.map((item) => ({
    ...item,
    isPrior: true,
  }));

  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };

  return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>{data.title}</h2>
      <div style={chartContainerStyle}>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={{ stroke: "#cbd5e1" }}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={{ stroke: "#cbd5e1" }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: "#1e293b", fontWeight: 600 }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
            />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="circle"
            />

            {priorMonths.length > 0 && (
              <Area
                type="monotone"
                dataKey={data.variables[0]?.name || "value"}
                data={priorData}
                stroke="none"
                fill="#f0f0f0"
                fillOpacity={1}
                isAnimationActive={false}
              />
            )}

            <Area
              type="monotone"
              dataKey={data.variables[0]?.name || "value"}
              stroke="none"
              fill="#f0f0f0"
              fillOpacity={0.3}
              name="Prior Months"
            />

            {data.variables.map((variable, index) => (
              <Line
                key={variable.name}
                type="monotone"
                dataKey={variable.name}
                stroke={variable.color}
                strokeWidth={2.5}
                dot={{ fill: variable.color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                name={variable.name}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "1.5rem",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
  border: "1px solid #e2e8f0",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#1e293b",
  marginBottom: "1rem",
};

const chartContainerStyle: React.CSSProperties = {
  width: "100%",
};

const tooltipStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "12px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};