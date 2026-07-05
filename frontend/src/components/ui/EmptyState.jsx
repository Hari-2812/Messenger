const EmptyState = ({ icon = '📭', title, description, action }) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon}</div>
    <p className="font-semibold text-gray-700">{title}</p>
    {description && <p className="empty-state-text mt-1">{description}</p>}
    {action}
  </div>
);

export default EmptyState;
