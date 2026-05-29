import Avatar from "boring-avatars";
import { Skeleton } from "@/components/ui/skeleton";

  type AgentChipProps = {
    address: string;
    name?: string;
    loading?: boolean;
  };

  const AVATAR_COLORS = ["#8b5cf6", "#a78bfa", "#6d28d9", "#c4b5fd", "#4c1d95"];

  function shortAddress(address: string): string {
    return `${address.slice(0, 4)}…${address.slice(-2)}`;
  }

  export function AgentChip({ address, name, loading = false }: AgentChipProps) {
    if (loading) {
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-3 w-20" />
        </div>
      );
    }

    const avatar = (
      <span className="h-6 w-6 shrink-0 overflow-hidden rounded-md">
        <Avatar size={24} name={address} variant="marble" square colors={AVATAR_COLORS} />
      </span>
    );

    if (!name) {
      return (
        <span className="inline-flex items-center gap-1.5" title={address}>
          {avatar}
          <span className="font-mono text-xs text-text-secondary">
            {shortAddress(address)}
          </span>
        </span>
      );
    }

    return (
      <div className="group flex items-center gap-2" title={address}>
        {avatar}
        <span className="flex flex-col leading-tight">
          <span className="text-sm text-text-primary group-hover:underline">
            {name}
          </span>
          <span className="font-mono text-xs text-text-muted">
            {shortAddress(address)}
          </span>
        </span>
      </div>
    );
  }
