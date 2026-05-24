import { Badge } from "@/components/ui/badge";


export function StatusBadge({ status }: { status: string }) {
  if (status === "SALE") return <Badge variant="success">판매중</Badge>;
  if (status === "SUSPEND") return <Badge variant="warning">판매중지</Badge>;
  if (status === "CLOSED") return <Badge variant="muted">판매종료</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
