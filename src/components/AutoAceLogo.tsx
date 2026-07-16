type Props = {
  className?: string;
  tone?: "light" | "dark";
};

export function AutoAceLogo({ className, tone = "dark" }: Props) {
  const color = tone === "light" ? "#FFFFFF" : "#1E3DFF";
  return (
    <div className={className} aria-label="AutoAce">
      <span
        className="inline-flex items-baseline font-black tracking-tight italic"
        style={{ color, fontSize: "inherit", letterSpacing: "-0.04em" }}
      >
        <span style={{ marginRight: "0.06em" }}>/</span>
        <span>AUTOACE</span>
      </span>
    </div>
  );
}
