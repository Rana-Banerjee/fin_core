import { ReactNode } from "react";

interface GraphCardProps {
  children: ReactNode;
}

export default function GraphCard({ children }: GraphCardProps) {
  return <>{children}</>;
}