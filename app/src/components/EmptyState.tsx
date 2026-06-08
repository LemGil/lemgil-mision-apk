interface EmptyStateProps {
  icon: string;
  title: string;
  sub: string;
}

export function EmptyState({ icon, title, sub }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
    </div>
  );
}
