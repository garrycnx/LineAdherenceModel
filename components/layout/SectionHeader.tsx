interface SectionHeaderProps {
  title: string;
  icon?: string;
}

export default function SectionHeader({ title, icon }: SectionHeaderProps) {
  return (
    <div className="section-header">
      {icon && <span className="text-base">{icon}</span>}
      <span>{title}</span>
    </div>
  );
}
